import { WebClient } from '@slack/web-api'
import { z } from 'zod'
import { writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import type { Connector, SourceData } from './registry'
import { envPath } from '../utils/config'

const SlackConfigSchema = z.object({
  channels: z.array(z.string()).default([]),
  include_dms: z.boolean().default(true),
  include_mentions: z.boolean().default(true),
})

type SlackConfig = z.infer<typeof SlackConfigSchema>

async function getWorkspaceUrl(client: WebClient): Promise<string | undefined> {
  if (process.env.SLACK_WORKSPACE_URL) return process.env.SLACK_WORKSPACE_URL
  try {
    const result = await client.auth.test()
    const url = result.url as string | undefined
    if (!url) return undefined
    // Persist so subsequent calls skip the API round-trip
    process.env.SLACK_WORKSPACE_URL = url
    const path = envPath()
    if (existsSync(path)) {
      const raw = await readFile(path, 'utf-8')
      if (!raw.includes('SLACK_WORKSPACE_URL=')) {
        await writeFile(path, raw.trimEnd() + `\nSLACK_WORKSPACE_URL=${url}\n`, 'utf-8')
      }
    }
    return url
  } catch {
    return undefined
  }
}

function buildPermalink(workspaceUrl: string, channelId: string, ts: string): string {
  return `${workspaceUrl}archives/${channelId}/p${ts.replace('.', '')}`
}

async function fetchChannelMessages(
  client: WebClient,
  channelId: string,
  since: Date,
  workspaceUrl?: string,
): Promise<{ content: string; author?: string; timestamp: Date; url?: string }[]> {
  const oldest = String(since.getTime() / 1000)
  const result = await client.conversations.history({
    channel: channelId,
    oldest,
    limit: 200,
  })

  const items = []
  for (const msg of result.messages ?? []) {
    if (!msg.text || msg.subtype) continue
    const ts = msg.ts ? new Date(parseFloat(msg.ts) * 1000) : new Date()

    let author: string | undefined
    if (msg.user) {
      try {
        const info = await client.users.info({ user: msg.user })
        author = info.user?.real_name ?? info.user?.name
      } catch {
        author = msg.user
      }
    }

    const url =
      workspaceUrl && msg.ts ? buildPermalink(workspaceUrl, channelId, msg.ts) : undefined

    items.push({ content: msg.text, author, timestamp: ts, url })
  }
  return items
}

async function resolveChannelId(client: WebClient, nameOrId: string): Promise<string> {
  if (/^[A-Z0-9]{8,}$/.test(nameOrId)) return nameOrId

  const name = nameOrId.replace(/^#/, '')
  let cursor: string | undefined
  do {
    const result = await client.conversations.list({
      types: 'public_channel,private_channel',
      cursor,
      limit: 200,
    })
    const match = result.channels?.find((c) => c.name === name)
    if (match?.id) return match.id
    cursor = result.response_metadata?.next_cursor
  } while (cursor)

  throw new Error(`Slack channel not found: ${nameOrId}`)
}

export const slackConnector: Connector = {
  id: 'slack',
  name: 'Slack',
  description: 'Fetch messages from Slack channels, DMs, and mentions',

  async fetch(rawConfig: unknown, since: Date): Promise<SourceData> {
    const config = SlackConfigSchema.parse(rawConfig)
    const token = process.env.SLACK_TOKEN
    if (!token) throw new Error('SLACK_TOKEN not set')

    const userId = process.env.SLACK_USER_ID
    const client = new WebClient(token)
    const items: SourceData['items'] = []

    const workspaceUrl = await getWorkspaceUrl(client)

    // Fetch selected channels
    for (const channel of config.channels) {
      try {
        const channelId = await resolveChannelId(client, channel)
        const messages = await fetchChannelMessages(client, channelId, since, workspaceUrl)
        items.push(...messages.map((m) => ({ ...m, content: `[${channel}] ${m.content}` })))
      } catch (err) {
        console.error(`Slack: failed to fetch ${channel}:`, err)
      }
    }

    // Fetch DMs
    if (config.include_dms) {
      try {
        const dms = await client.conversations.list({ types: 'im', limit: 20 })
        for (const dm of dms.channels ?? []) {
          if (!dm.id) continue
          const messages = await fetchChannelMessages(client, dm.id, since, workspaceUrl)
          items.push(...messages.map((m) => ({ ...m, content: `[DM] ${m.content}` })))
        }
      } catch (err) {
        console.error('Slack: failed to fetch DMs:', err)
      }
    }

    // Fetch mentions
    if (config.include_mentions && userId) {
      try {
        const result = await client.search.messages({
          query: `<@${userId}>`,
          count: 50,
        })
        for (const match of result.messages?.matches ?? []) {
          if (!match.text) continue
          const ts = match.ts ? new Date(parseFloat(match.ts) * 1000) : new Date()
          if (ts < since) continue
          items.push({
            content: `[Mention in #${match.channel?.name ?? 'unknown'}] ${match.text}`,
            author: match.username,
            timestamp: ts,
            url: match.permalink,
          })
        }
      } catch (err) {
        console.error('Slack: failed to fetch mentions:', err)
      }
    }

    items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    return { source: 'Slack', items }
  },
}

import notifier from 'node-notifier'
import { WebClient } from '@slack/web-api'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { envPath } from './config'

async function getSlackToken(): Promise<string | null> {
  const path = envPath()
  if (!existsSync(path)) return null
  const raw = await readFile(path, 'utf-8')
  for (const line of raw.split('\n')) {
    const match = line.match(/^SLACK_TOKEN=(.+)$/)
    if (match?.[1]) return match[1].trim()
  }
  return null
}

async function getSlackUserId(): Promise<string | null> {
  const path = envPath()
  if (!existsSync(path)) return null
  const raw = await readFile(path, 'utf-8')
  for (const line of raw.split('\n')) {
    const match = line.match(/^SLACK_USER_ID=(.+)$/)
    if (match?.[1]) return match[1].trim()
  }
  return null
}

export async function sendNotifications(title: string, summary: string): Promise<void> {
  await Promise.allSettled([
    sendDesktopNotification(title, summary),
    sendSlackDM(title, summary),
  ])
}

async function sendDesktopNotification(title: string, message: string): Promise<void> {
  notifier.notify({
    title,
    message: message.slice(0, 200),
    sound: false,
    open: 'http://localhost:3000',
  })
}

async function sendSlackDM(title: string, body: string): Promise<void> {
  const token = await getSlackToken()
  const userId = await getSlackUserId()
  if (!token || !userId) return

  const client = new WebClient(token)
  await client.chat.postMessage({
    channel: userId,
    text: `*${title}*\n\n${body}`,
    mrkdwn: true,
  })
}

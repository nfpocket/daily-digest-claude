import { WebClient } from '@slack/web-api'

export default defineEventHandler(async () => {
  const token = process.env.SLACK_TOKEN
  if (!token) throw createError({ statusCode: 400, message: 'SLACK_TOKEN not set' })

  const client = new WebClient(token)
  const result = await client.conversations.list({
    types: 'public_channel,private_channel',
    exclude_archived: true,
    limit: 200,
  })

  return (result.channels ?? [])
    .filter((c) => c.is_member)
    .map((c) => ({ id: c.id, name: c.name }))
    .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
})

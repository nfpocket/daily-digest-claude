import notifier from 'node-notifier'
import { WebClient } from '@slack/web-api'

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
  const userId = process.env.SLACK_USER_ID
  if (!userId) return

  // Prefer bot token (unified identity); fall back to user token
  const botToken = process.env.SLACK_BOT_TOKEN
  const userToken = process.env.SLACK_TOKEN
  const token = botToken ?? userToken
  if (!token) return

  const client = new WebClient(token)
  await client.chat.postMessage({
    channel: userId,
    text: `*${title}*\n\n${body}\n\nView at http://localhost:3005`,
    mrkdwn: true,
  })
}

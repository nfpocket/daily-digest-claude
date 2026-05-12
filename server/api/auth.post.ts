import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { envPath, digestsDir } from '../utils/config'

interface AuthBody {
  slackToken?: string
  slackUserId?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<AuthBody>(event)

  const dir = join(process.cwd(), '.digest')
  if (!existsSync(dir)) await mkdir(dir, { recursive: true })

  const digestDir = digestsDir()
  if (!existsSync(digestDir)) await mkdir(digestDir, { recursive: true })

  // Read existing env to preserve non-Slack keys
  let existing: Record<string, string> = {}
  const path = envPath()
  if (existsSync(path)) {
    const raw = await readFile(path, 'utf-8')
    for (const line of raw.split('\n')) {
      const eq = line.indexOf('=')
      if (eq !== -1) existing[line.slice(0, eq).trim()] = line.slice(eq + 1).trim()
    }
  }

  if (body.slackToken) existing['SLACK_TOKEN'] = body.slackToken
  if (body.slackUserId) existing['SLACK_USER_ID'] = body.slackUserId

  const lines = Object.entries(existing).map(([k, v]) => `${k}=${v}`)
  await writeFile(path, lines.join('\n') + '\n', 'utf-8')

  for (const [k, v] of Object.entries(existing)) process.env[k] = v

  return { ok: true }
})

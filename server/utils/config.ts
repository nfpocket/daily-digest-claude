import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync, readFileSync as readFileSync$ } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'
import { z } from 'zod'

const SlackSourceConfigSchema = z.object({
  connector: z.literal('slack'),
  channels: z.array(z.string()).default([]),
  include_dms: z.boolean().default(true),
  include_mentions: z.boolean().default(true),
})

const SourceConfigSchema = SlackSourceConfigSchema

export type SourceConfig = z.infer<typeof SourceConfigSchema>

const ScheduleEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  days: z.array(z.number().min(0).max(6)),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  sources: z.array(SourceConfigSchema).default([]),
  prompt: z.string().nullable().default(null),
})

export type ScheduleEntry = z.infer<typeof ScheduleEntrySchema>

const AppConfigSchema = z.object({
  schedules: z.array(ScheduleEntrySchema).default([]),
})

export type AppConfig = z.infer<typeof AppConfigSchema>

function digestDir() {
  return join(process.cwd(), '.digest')
}

function configPath() {
  return join(digestDir(), 'config.md')
}

export function isConfigured(): boolean {
  const path = configPath()
  if (!existsSync(path)) return false
  try {
    const raw = readFileSync$(path, 'utf-8')
    const { data } = matter(raw)
    const cfg = AppConfigSchema.safeParse(data)
    return cfg.success && cfg.data.schedules.length > 0
  } catch {
    return false
  }
}

export async function readConfig(): Promise<AppConfig> {
  const path = configPath()
  if (!existsSync(path)) {
    return AppConfigSchema.parse({ schedules: [] })
  }
  const raw = await readFile(path, 'utf-8')
  const { data } = matter(raw)
  return AppConfigSchema.parse(data)
}

export async function writeConfig(config: AppConfig): Promise<void> {
  const dir = digestDir()
  if (!existsSync(dir)) await mkdir(dir, { recursive: true })
  const validated = AppConfigSchema.parse(config)
  const content = matter.stringify('', validated)
  await writeFile(configPath(), content, 'utf-8')
}

export function digestsDir() {
  return join(digestDir(), 'digests')
}

export function envPath() {
  return join(digestDir(), '.env')
}

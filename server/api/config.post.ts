import { writeConfig, type AppConfig } from '../utils/config'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ config: AppConfig }>(event)
  await writeConfig(body.config)
  return { ok: true }
})

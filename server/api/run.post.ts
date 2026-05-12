import { runDigest } from '../utils/digest'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ entryId: string }>(event)
  if (!body.entryId) throw createError({ statusCode: 400, message: 'entryId required' })
  const filepath = await runDigest(body.entryId, undefined, "manual")
  return { ok: true, filepath }
})

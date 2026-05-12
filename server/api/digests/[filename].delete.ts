import { unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { digestsDir } from '../../utils/config'

export default defineEventHandler(async (event) => {
  const filename = getRouterParam(event, 'filename')!
  if (!/^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}\.md$/.test(filename)) {
    throw createError({ statusCode: 400, message: 'Invalid filename' })
  }
  await unlink(join(digestsDir(), filename))
  return { ok: true }
})

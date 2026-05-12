import { readDigest } from '../../utils/digest'

export default defineEventHandler(async (event) => {
  const filename = getRouterParam(event, 'filename')
  if (!filename) throw createError({ statusCode: 400, message: 'filename required' })
  // Prevent path traversal
  if (filename.includes('/') || filename.includes('..')) {
    throw createError({ statusCode: 400, message: 'invalid filename' })
  }
  return { content: await readDigest(filename) }
})

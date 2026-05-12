import { createEventStream } from 'h3'
import { runDigest } from '../../utils/digest'

export default defineEventHandler(async (event) => {
  const { entryId } = getQuery(event) as { entryId: string }
  if (!entryId) throw createError({ statusCode: 400, message: 'entryId required' })

  const eventStream = createEventStream(event)

  runDigest(entryId, (e) => {
    eventStream.push(JSON.stringify(e))
  })
    .then((filepath) => {
      eventStream.push(JSON.stringify({ type: 'done', filepath }))
      eventStream.close()
    })
    .catch((err: any) => {
      eventStream.push(JSON.stringify({ type: 'error', message: err?.message ?? String(err) }))
      eventStream.close()
    })

  return eventStream.send()
})

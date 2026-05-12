import { listDigests } from '../utils/digest'

export default defineEventHandler(async () => {
  return listDigests()
})

import { readConfig, isConfigured } from '../utils/config'
import { hasAuth } from '../utils/claude'

export default defineEventHandler(async () => {
  const [config, authOk, configured] = await Promise.all([
    readConfig(),
    hasAuth(),
    Promise.resolve(isConfigured()),
  ])
  return { config, authOk, configured }
})

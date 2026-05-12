import { isLaunchAgentInstalled } from '../utils/launchagent'

export default defineEventHandler(async () => {
  return { installed: await isLaunchAgentInstalled() }
})

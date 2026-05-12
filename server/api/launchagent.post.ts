import { installLaunchAgent, uninstallLaunchAgent } from '../utils/launchagent'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ action: 'install' | 'uninstall' }>(event)
  if (body.action === 'install') {
    await installLaunchAgent()
  } else {
    await uninstallLaunchAgent()
  }
  return { ok: true }
})

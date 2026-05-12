import { writeFile, readFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

const LABEL = 'com.daily-digest'
const PLIST_PATH = join(process.env.HOME!, 'Library/LaunchAgents', `${LABEL}.plist`)

function buildPlist(projectDir: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>${join(projectDir, '.output/server/index.mjs')}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${projectDir}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${join(projectDir, '.digest/app.log')}</string>
  <key>StandardErrorPath</key>
  <string>${join(projectDir, '.digest/app.error.log')}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PORT</key>
    <string>3000</string>
  </dict>
</dict>
</plist>`
}

export async function installLaunchAgent(): Promise<void> {
  const projectDir = process.cwd()
  const launchAgentsDir = join(process.env.HOME!, 'Library/LaunchAgents')
  if (!existsSync(launchAgentsDir)) await mkdir(launchAgentsDir, { recursive: true })

  await writeFile(PLIST_PATH, buildPlist(projectDir), 'utf-8')
  await execAsync(`launchctl load -w "${PLIST_PATH}"`)
}

export async function uninstallLaunchAgent(): Promise<void> {
  if (!existsSync(PLIST_PATH)) return
  await execAsync(`launchctl unload -w "${PLIST_PATH}"`)
  const { unlink } = await import('node:fs/promises')
  await unlink(PLIST_PATH)
}

export async function isLaunchAgentInstalled(): Promise<boolean> {
  if (!existsSync(PLIST_PATH)) return false
  try {
    const { stdout } = await execAsync(`launchctl list ${LABEL}`)
    return stdout.includes(LABEL)
  } catch {
    return false
  }
}

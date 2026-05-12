import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

export default defineEventHandler(async (event) => {
  const body = await readBody<{ description: string }>(event)
  if (!body.description?.trim()) {
    throw createError({ statusCode: 400, message: 'description required' })
  }

  const prompt = [
    `Create a new connector in server/connectors/ that implements the Connector interface defined in server/connectors/index.ts.`,
    `The connector should: ${body.description}`,
    `Requirements:`,
    `- Create a new file e.g. server/connectors/[name].ts`,
    `- Implement the Connector interface: { id, name, description, fetch(config, since) }`,
    `- Import registerConnector and types from './registry' (NOT from './index' — avoid circular deps)`,
    `- Call registerConnector() at the bottom of the file to self-register`,
    `- Add an import for the new file at the bottom of server/connectors/index.ts (like the existing slack import)`,
    `- Use server/connectors/slack.ts as a reference for how connectors are structured`,
    `- Include proper error handling`,
    `- Do not modify any other files`,
  ].join('\n')

  const cwd = process.cwd()
  await execAsync(`claude --print "${prompt.replace(/"/g, '\\"')}"`, {
    cwd,
    timeout: 120_000,
    env: { ...process.env, PATH: process.env.PATH },
  })

  return { ok: true }
})

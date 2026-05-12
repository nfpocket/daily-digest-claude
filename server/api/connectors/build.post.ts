import { runWithCLI } from '../../utils/claude'

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
    `- Import types (Connector, SourceData, SourceItem) from './registry' (NOT from './index' — avoid circular deps)`,
    `- Export your connector object as a named export (e.g. export const myConnector: Connector = { ... })`,
    `- Add an import for the new file at the bottom of server/connectors/index.ts, and push your connector into the connectors array (like the existing slack entry)`,
    `- Use server/connectors/slack.ts as a reference for how connectors are structured`,
    `- Include proper error handling`,
    `- Do not modify any other files`,
  ].join('\n')

  await runWithCLI(prompt)

  return { ok: true }
})

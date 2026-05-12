---
name: add-connector
description: Add a new data-source connector to the daily-digest-claude app. Creates server/connectors/[name].ts implementing the Connector interface and registers it in server/connectors/index.ts. Use when user wants to add a connector, integrate a new data source, or says "add connector", "build connector", "fetch from X".
---

# add-connector

Add a new connector that fetches data from an external source and feeds it into digests.

## Quick start

```
/add-connector Fetch GitHub issues assigned to me that were updated today
```

## Workflow

1. **Derive a short kebab-case name** from the description (e.g. `github-issues`)
2. **Create `server/connectors/[name].ts`** — see template below
3. **Register in `server/connectors/index.ts`** — add import + push to array
4. **Confirm** the connector appears in `listConnectors()` output

## Connector template

```typescript
import { z } from 'zod'
import type { Connector, SourceData } from './registry'

const ConfigSchema = z.object({
  // fields the user configures per-schedule-entry
  // e.g. repo: z.string(), label: z.string().optional()
})

export const myConnector: Connector = {
  id: 'my-name',           // matches the filename stem
  name: 'Display Name',
  description: 'One sentence: what it fetches',

  async fetch(rawConfig: unknown, since: Date): Promise<SourceData> {
    const config = ConfigSchema.parse(rawConfig)
    const token = process.env.MY_TOKEN
    if (!token) throw new Error('MY_TOKEN not set')

    const items: SourceData['items'] = []

    try {
      // fetch data, filter to items newer than `since`
      // push: { content, author?, timestamp, url? }
    } catch (err) {
      console.error('MyConnector: fetch failed:', err)
    }

    items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    return { source: 'Display Name', items }
  },
}
```

## Registering in index.ts

```typescript
// server/connectors/index.ts  (existing file — edit, don't replace)
import { myConnector } from './my-name'   // add import

const connectors: Connector[] = [
  slackConnector,
  myConnector,   // add here
]
```

## Rules

- Import types from `'./registry'`, never from `'./index'` (avoids circular dep)
- Export the connector as a named `const`, not default export
- Wrap each fetch operation in try/catch — a failing connector must not crash the digest
- Filter fetched items to `timestamp >= since` before returning
- Sort items ascending by timestamp
- Auth tokens go in `.digest/.env` (loaded automatically via `server/plugins/env.ts`)
- Reference: `server/connectors/slack.ts` is the canonical example

export type { Connector, SourceData, SourceItem } from './registry'
import type { Connector } from './registry'
import { slackConnector } from './slack'

const connectors: Connector[] = [
  slackConnector,
  // Add new connectors here
]

export function getConnector(id: string): Connector | undefined {
  return connectors.find((c) => c.id === id)
}

export function listConnectors(): Connector[] {
  return connectors
}

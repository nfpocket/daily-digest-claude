export interface SourceItem {
  content: string
  author?: string
  timestamp: Date
  url?: string
}

export interface SourceData {
  source: string
  items: SourceItem[]
}

export interface Connector {
  id: string
  name: string
  description: string
  fetch(config: unknown, since: Date): Promise<SourceData>
}

const registry = new Map<string, Connector>()

export function registerConnector(connector: Connector): void {
  registry.set(connector.id, connector)
}

export function getConnector(id: string): Connector | undefined {
  return registry.get(id)
}

export function listConnectors(): Connector[] {
  return Array.from(registry.values())
}

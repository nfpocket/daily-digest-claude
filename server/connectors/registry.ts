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


import { listConnectors } from '../../connectors/index'

export default defineEventHandler(() => {
  return listConnectors().map((c) => ({ id: c.id, name: c.name, description: c.description }))
})

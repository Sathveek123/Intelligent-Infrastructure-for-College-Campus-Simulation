import type { MaintenanceRecord } from '@/types'
import { addMaintenance, deleteMaintenance as removeMaintenance, fetchBuildings as fetchAllBuildings, fetchMaintenance as fetchAllMaintenance, fetchRooms as fetchAllRooms, updateMaintenance as patchMaintenance } from '@/services/mockData'

type ListResult<T> = { data: T; meta?: { page: number; limit: number; total: number; totalPages: number } }

function paginate<T>(items: T[], page = 1, limit = 25) {
  const safePage = Math.max(1, Math.floor(page))
  const safeLimit = Math.max(1, Math.floor(limit))
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / safeLimit))
  const clampedPage = Math.min(safePage, totalPages)
  const start = (clampedPage - 1) * safeLimit
  return {
    data: items.slice(start, start + safeLimit),
    meta: { page: clampedPage, limit: safeLimit, total, totalPages },
  }
}

export async function fetchMaintenance(params?: { page?: number; limit?: number; search?: string; buildingId?: string; roomId?: string; status?: string; priority?: string }) {
  const [all, buildings, rooms] = await Promise.all([fetchAllMaintenance(), fetchAllBuildings(), fetchAllRooms()])
  const buildingMap = new Map(buildings.map((b) => [b.id, b]))
  const roomMap = new Map(rooms.map((r) => [r.id, r]))

  const q = (params?.search ?? '').trim().toLowerCase()
  const status = (params?.status ?? '').trim().toLowerCase()
  const priority = (params?.priority ?? '').trim().toLowerCase()
  const buildingId = (params?.buildingId ?? '').trim()
  const roomId = (params?.roomId ?? '').trim()

  const filtered = all.filter((m) => {
    if (q) {
      const hay = `${m.targetName} ${m.issueDescription}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    if (status && m.status !== status) return false
    if (priority && m.priority !== priority) return false
    if (buildingId) {
      if (!(m.type === 'building' && m.targetId === buildingId)) return false
    }
    if (roomId) {
      if (!(m.type === 'room' && m.targetId === roomId)) return false
    }
    return true
  })

  const hydrated = filtered.map((m) => {
    if (m.type === 'building') {
      const b = buildingMap.get(m.targetId)
      return { ...m, targetName: b?.buildingName ?? m.targetName }
    }
    const r = roomMap.get(m.targetId)
    return { ...m, targetName: r?.roomNumber ?? m.targetName }
  })

  const { data, meta } = paginate(hydrated, params?.page ?? 1, params?.limit ?? 25)
  return { data, meta: meta as ListResult<MaintenanceRecord[]>['meta'] }
}

export type MaintenanceUpsertDto = {
  buildingId?: string | null
  roomId?: string | null
  maintenanceDate: string
  issueDescription: string
  resolution?: string
  priority: MaintenanceRecord['priority']
  status?: MaintenanceRecord['status']
  cost?: number
}

export async function createMaintenance(data: MaintenanceUpsertDto) {
  const buildings = await fetchAllBuildings()
  const rooms = await fetchAllRooms()
  const b = data.buildingId ? buildings.find((x) => x.id === data.buildingId) : null
  const r = data.roomId ? rooms.find((x) => x.id === data.roomId) : null

  const next: Omit<MaintenanceRecord, 'id'> = {
    type: data.roomId ? 'room' : 'building',
    targetId: data.roomId ?? data.buildingId ?? '',
    targetName: r?.roomNumber ?? b?.buildingName ?? 'Unknown',
    maintenanceDate: data.maintenanceDate,
    issueDescription: data.issueDescription,
    resolution: data.resolution,
    priority: data.priority,
    status: data.status ?? 'pending',
    cost: data.cost,
    createdBy: 'Campus Admin',
  }
  if (!next.targetId) throw new Error('buildingId or roomId is required')
  return await addMaintenance(next)
}

export async function updateMaintenance(id: string, data: Partial<MaintenanceUpsertDto>) {
  const patch: Partial<MaintenanceRecord> = {
    maintenanceDate: data.maintenanceDate,
    issueDescription: data.issueDescription,
    resolution: data.resolution,
    priority: data.priority as any,
    status: data.status as any,
    cost: data.cost,
  }
  return await patchMaintenance(id, patch)
}

export async function deleteMaintenance(id: string) {
  await removeMaintenance(id)
  return { success: true } as any
}

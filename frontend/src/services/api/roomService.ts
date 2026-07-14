import type { Room } from '@/types'
import { addRoom, deleteRoom as removeRoom, fetchBuildings as fetchAllBuildings, fetchRooms as fetchAllRooms, updateRoom as patchRoom } from '@/services/mockData'

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

export async function fetchRooms(params?: { page?: number; limit?: number; search?: string; buildingId?: string; status?: string; roomType?: string }) {
  const [allRooms, allBuildings] = await Promise.all([fetchAllRooms(), fetchAllBuildings()])
  const q = (params?.search ?? '').trim().toLowerCase()
  const buildingId = (params?.buildingId ?? '').trim()
  const status = (params?.status ?? '').trim().toLowerCase()
  const roomType = (params?.roomType ?? '').trim().toLowerCase()

  const buildingMap = new Map(allBuildings.map((b) => [b.id, b]))

  const filtered = allRooms
    .map((r) => ({ ...r, buildingName: r.buildingName ?? buildingMap.get(r.buildingId)?.buildingName }))
    .filter((r) => {
      if (q) {
        const hay = `${r.roomNumber} ${r.buildingName ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (buildingId && r.buildingId !== buildingId) return false
      if (status && r.status !== status) return false
      if (roomType && r.roomType !== roomType) return false
      return true
    })

  const { data, meta } = paginate(filtered, params?.page ?? 1, params?.limit ?? 25)
  return { data, meta: meta as ListResult<Room[]>['meta'] }
}

export async function createRoom(data: Partial<Room>) {
  if (!data.buildingId) throw new Error('buildingId is required')
  const buildings = await fetchAllBuildings()
  const building = buildings.find((b) => b.id === data.buildingId)
  const next = {
    buildingId: data.buildingId,
    buildingName: data.buildingName ?? building?.buildingName,
    roomNumber: data.roomNumber ?? `RM-${Math.random().toString(16).slice(2, 6).toUpperCase()}`,
    floor: data.floor ?? 1,
    capacity: data.capacity ?? 40,
    roomType: data.roomType ?? 'classroom',
    equipmentList: data.equipmentList,
    status: data.status ?? 'available',
    currentOccupancy: data.currentOccupancy,
    utilizationRate: data.utilizationRate,
  } satisfies Omit<Room, 'id'>

  return await addRoom(next)
}

export async function updateRoom(id: string, data: Partial<Room>) {
  return await patchRoom(id, data)
}

export async function deleteRoom(id: string) {
  await removeRoom(id)
  return { success: true } as any
}

import type { Building } from '@/types'
import { addBuilding, deleteBuilding as removeBuilding, fetchBuildings as fetchAllBuildings, updateBuilding as patchBuilding } from '@/services/mockData'

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

export async function fetchBuildings(params?: { page?: number; limit?: number; search?: string; buildingType?: string }) {
  const all = await fetchAllBuildings()
  const q = (params?.search ?? '').trim().toLowerCase()
  const type = (params?.buildingType ?? '').trim().toLowerCase()

  const filtered = all.filter((b) => {
    if (q) {
      const hay = `${b.buildingName} ${b.buildingCode}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    if (type) {
      if (b.buildingType !== type) return false
    }
    return true
  })

  const { data, meta } = paginate(filtered, params?.page ?? 1, params?.limit ?? 25)
  return { data, meta: meta as ListResult<Building[]>['meta'] }
}

export async function fetchBuildingById(id: string) {
  const all = await fetchAllBuildings()
  const found = all.find((b) => b.id === id)
  if (!found) throw new Error('Building not found')
  return found
}

export async function createBuilding(data: Partial<Building>) {
  const next = {
    buildingName: data.buildingName ?? 'New Building',
    buildingCode: data.buildingCode ?? `BLD-${Math.random().toString(16).slice(2, 6).toUpperCase()}`,
    totalFloors: data.totalFloors ?? 1,
    totalRooms: data.totalRooms ?? 0,
    constructionYear: data.constructionYear ?? new Date().getFullYear(),
    buildingType: data.buildingType ?? 'academic',
    baseEnergyLoad: data.baseEnergyLoad ?? 0,
    occupancyRate: data.occupancyRate,
  } satisfies Omit<Building, 'id'>

  return await addBuilding(next)
}

export async function updateBuilding(id: string, data: Partial<Building>) {
  return await patchBuilding(id, data)
}

export async function deleteBuilding(id: string) {
  await removeBuilding(id)
  return { success: true } as any
}

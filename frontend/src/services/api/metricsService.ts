import type { BuildingMetrics } from '@/types'
import { fetchBuildings, fetchMaintenance, fetchRooms } from '@/services/mockData'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function scoreToStatus(score: number): BuildingMetrics['healthStatus'] {
  if (score >= 75) return 'healthy'
  if (score >= 50) return 'moderate'
  return 'critical'
}

export async function fetchAllBuildingMetrics() {
  const [buildings, rooms, maintenance] = await Promise.all([fetchBuildings(), fetchRooms(), fetchMaintenance()])
  const roomCounts = new Map<string, number>()
  for (const r of rooms) roomCounts.set(r.buildingId, (roomCounts.get(r.buildingId) ?? 0) + 1)
  const maintenanceCounts = new Map<string, number>()
  for (const m of maintenance) {
    if (m.type !== 'building') continue
    maintenanceCounts.set(m.targetId, (maintenanceCounts.get(m.targetId) ?? 0) + 1)
  }

  const now = new Date().toISOString()
  return buildings.map((b) => {
    const occ = typeof b.occupancyRate === 'number' ? b.occupancyRate : 60
    const roomFactor = clamp((roomCounts.get(b.id) ?? b.totalRooms ?? 0) / 80, 0, 1)
    const maint = maintenanceCounts.get(b.id) ?? 0
    const maintenancePenalty = clamp(maint * 3, 0, 30)
    const energyPenalty = clamp((b.baseEnergyLoad ?? 0) / 50, 0, 25)
    const healthScore = clamp(Math.round(85 - maintenancePenalty - energyPenalty + (occ - 65) * 0.25 - roomFactor * 6), 0, 100)
    const healthStatus = scoreToStatus(healthScore)
    return {
      buildingId: b.id,
      buildingName: b.buildingName,
      buildingCode: b.buildingCode,
      buildingType: b.buildingType,
      healthScore,
      healthStatus,
      components: {
        occupancyEfficiency: clamp(Math.round(100 - Math.abs(occ - 70)), 0, 100),
        energyEfficiency: clamp(Math.round(100 - (b.baseEnergyLoad ?? 0) / 10), 0, 100),
        maintenanceHealth: clamp(100 - maintenancePenalty, 0, 100),
      },
      lastCalculated: now,
    }
  })
}

export async function fetchBuildingMetrics(buildingId: string) {
  const all = await fetchAllBuildingMetrics()
  const found = all.find((m) => m.buildingId === buildingId)
  if (!found) throw new Error('Building metrics not found')
  return found
}

export async function recalculateBuildingMetrics(buildingId: string) {
  await fetchBuildingMetrics(buildingId)
  return { ok: true }
}

export async function recalculateAllMetrics() {
  await fetchAllBuildingMetrics()
  return { ok: true }
}

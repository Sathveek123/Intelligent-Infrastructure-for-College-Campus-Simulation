import type { BuildingHealthOverview, CorrelationData, HealthAnomaly, HealthSnapshot, HealthTrend } from '@/types'
import { fetchBuildings, fetchMaintenance, fetchRooms } from '@/services/mockData'

function daysBack(n: number) {
  const out: string[] = []
  const d = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d)
    x.setDate(d.getDate() - i)
    out.push(x.toISOString().slice(0, 10))
  }
  return out
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function seededRandom(seed: number) {
  // deterministic pseudo-random
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

export async function fetchDashboardSummary() {
  const [buildings, rooms, maintenance] = await Promise.all([fetchBuildings(), fetchRooms(), fetchMaintenance()])
  const totalBuildings = buildings.length
  const totalRooms = rooms.length
  const occValues = buildings.map((b) => (typeof b.occupancyRate === 'number' ? b.occupancyRate : 0))
  const currentOccupancyRate = occValues.length ? occValues.reduce((a, b) => a + b, 0) / occValues.length : 0
  const activeMaintenanceAlerts = maintenance.filter((m) => m.status !== 'completed').length
  const todayEnergyConsumption = buildings.reduce((a, b) => a + (b.baseEnergyLoad ?? 0), 0)
  return { totalBuildings, totalRooms, currentOccupancyRate, activeMaintenanceAlerts, todayEnergyConsumption }
}

export async function fetchOccupancyTrend(params?: { buildingId?: string; startDate?: string; endDate?: string }) {
  const buildings = await fetchBuildings()
  const selected = params?.buildingId ? buildings.filter((b) => b.id === params.buildingId) : buildings
  const base = selected.length
    ? selected.reduce((a, b) => a + (typeof b.occupancyRate === 'number' ? b.occupancyRate : 0), 0) / selected.length
    : 0

  const dates = daysBack(7)
  return dates.map((date, idx) => {
    const jitter = (seededRandom(idx + base) - 0.5) * 10
    return { date, averageOccupancy: clamp(Math.round(base + jitter), 0, 100) }
  })
}

export async function fetchEnergyTrend(params?: { buildingId?: string; startDate?: string; endDate?: string }) {
  const buildings = await fetchBuildings()
  const selected = params?.buildingId ? buildings.filter((b) => b.id === params.buildingId) : buildings
  const base = selected.reduce((a, b) => a + (b.baseEnergyLoad ?? 0), 0)
  const dates = daysBack(7)
  return dates.map((date, idx) => {
    const jitter = (seededRandom(idx + base) - 0.5) * (base * 0.08)
    return { date, totalEnergy: Math.max(0, Math.round(base + jitter)) }
  })
}

export async function fetchHeatmap() {
  const [buildings, rooms] = await Promise.all([fetchBuildings(), fetchRooms()])
  const buildingMap = new Map(buildings.map((b) => [b.id, b]))
  return rooms.slice(0, 200).map((r, idx) => {
    const b = buildingMap.get(r.buildingId)
    const util = typeof r.utilizationRate === 'number' ? r.utilizationRate : clamp(Math.round((seededRandom(idx + r.capacity) || 0) * 100), 0, 100)
    return {
      buildingId: r.buildingId,
      buildingName: r.buildingName ?? b?.buildingName ?? 'Unknown',
      roomId: r.id,
      roomNumber: r.roomNumber,
      utilizationRate: util,
    }
  })
}

export async function fetchBuildingComparison() {
  const [buildings, maintenance] = await Promise.all([fetchBuildings(), fetchMaintenance()])
  const maintenanceCount = new Map<string, number>()
  for (const m of maintenance) {
    const bid = m.type === 'building' ? m.targetId : null
    if (!bid) continue
    maintenanceCount.set(bid, (maintenanceCount.get(bid) ?? 0) + 1)
  }

  return buildings.map((b, idx) => ({
    buildingId: b.id,
    buildingName: b.buildingName,
    avgOccupancy: typeof b.occupancyRate === 'number' ? b.occupancyRate : clamp(Math.round(seededRandom(idx + 10) * 100), 0, 100),
    totalEnergy: b.baseEnergyLoad ?? 0,
    maintenanceCount: maintenanceCount.get(b.id) ?? 0,
  }))
}

export async function fetchHealthTrend(buildingId: string, days: number) {
  const buildings = await fetchBuildings()
  const b = buildings.find((x) => x.id === buildingId)
  if (!b) throw new Error('Building not found')

  const dates = daysBack(days)
  const base = clamp(Math.round((typeof b.occupancyRate === 'number' ? b.occupancyRate : 60) * 0.9 + 10), 10, 95)

  const snapshots: HealthSnapshot[] = dates.map((date, i) => {
    const noise = (seededRandom(i + base) - 0.5) * 12
    const healthScore = clamp(Math.round(base + noise), 0, 100)
    const healthStatus = healthScore >= 75 ? 'healthy' : healthScore >= 50 ? 'moderate' : 'critical'
    return {
      date,
      healthScore,
      healthStatus,
      components: {
        occupancyEfficiency: clamp(Math.round((typeof b.occupancyRate === 'number' ? b.occupancyRate : 60) + noise), 0, 100),
        energyEfficiency: clamp(Math.round(70 + (seededRandom(i + 2) - 0.5) * 20), 0, 100),
        maintenanceHealth: clamp(Math.round(80 + (seededRandom(i + 3) - 0.5) * 25), 0, 100),
      },
    }
  })

  const first = snapshots[0]?.healthScore ?? base
  const last = snapshots[snapshots.length - 1]?.healthScore ?? base
  const direction: HealthTrend['direction'] = last > first + 2 ? 'improving' : last < first - 2 ? 'declining' : 'stable'

  const averageChange = snapshots.length > 1 ? Number(((last - first) / (snapshots.length - 1)).toFixed(2)) : 0
  const movingAverage7Day = Math.round(snapshots.slice(-7).reduce((a, s) => a + s.healthScore, 0) / Math.max(1, Math.min(7, snapshots.length)))
  const movingAverage30Day = Math.round(snapshots.slice(-30).reduce((a, s) => a + s.healthScore, 0) / Math.max(1, Math.min(30, snapshots.length)))
  const trend: HealthTrend = { direction, averageChange, movingAverage7Day, movingAverage30Day }

  const anomalies: HealthAnomaly[] = []
  for (let i = 1; i < snapshots.length; i++) {
    const diff = snapshots[i].healthScore - snapshots[i - 1].healthScore
    if (diff < -18) {
      anomalies.push({
        date: snapshots[i].date,
        type: 'sudden_drop',
        description: 'Sudden health score drop detected',
        severity: 'high',
      })
    }
  }

  return {
    buildingId: b.id,
    buildingName: b.buildingName,
    currentScore: last,
    snapshots,
    trend,
    anomalies,
  }
}

export async function fetchHealthOverview(days: number) {
  const buildings = await fetchBuildings()
  return buildings.slice(0, 12).map((b, idx) => {
    const base = typeof b.occupancyRate === 'number' ? b.occupancyRate : 60
    const currentScore = clamp(Math.round(base * 0.8 + 20 + (seededRandom(idx + days) - 0.5) * 10), 0, 100)
    const scoreChange7Day = Math.round(((seededRandom(idx + 7) - 0.5) * 12) * 10) / 10
    const trend: BuildingHealthOverview['trend'] = scoreChange7Day > 1 ? 'improving' : scoreChange7Day < -1 ? 'declining' : 'stable'
    const currentStatus: BuildingHealthOverview['currentStatus'] = currentScore >= 75 ? 'healthy' : currentScore >= 50 ? 'moderate' : 'critical'
    return {
      buildingId: b.id,
      buildingName: b.buildingName,
      currentScore,
      currentStatus,
      scoreChange7Day,
      trend,
    }
  })
}

export async function fetchCorrelation(buildingId: string, days: number) {
  const buildings = await fetchBuildings()
  const b = buildings.find((x) => x.id === buildingId)
  if (!b) throw new Error('Building not found')

  const dates = daysBack(days).map((d) => d)
  const energyEfficiency = dates.map((_, i) => clamp(Math.round(60 + (seededRandom(i + 1) - 0.5) * 25), 0, 100))
  const occupancyEfficiency = dates.map((_, i) => clamp(Math.round((typeof b.occupancyRate === 'number' ? b.occupancyRate : 60) + (seededRandom(i + 2) - 0.5) * 20), 0, 100))
  const correlation = Number(((seededRandom(days + 99) - 0.5) * 1.2).toFixed(2))
  const insight = correlation > 0.3 ? 'Higher occupancy tends to increase energy usage.' : correlation < -0.3 ? 'Energy usage decreases as occupancy rises (possible efficiency gains).' : 'Weak correlation between energy and occupancy.'

  return { dates, energyEfficiency, occupancyEfficiency, correlation, insight }
}

export async function createManualSnapshot(buildingId: string) {
  // Local mode: no-op
  await fetchBuildings()
  return { message: `Snapshot created locally for ${buildingId}` }
}

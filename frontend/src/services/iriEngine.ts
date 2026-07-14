import type { Building, MaintenanceRecord } from '@/types'
import type { BuildingAge } from '@/types/agingModel'
import type { PowerGrid } from '@/types/gridModel'

export interface IRIComponents {
  gridRisk: number
  stressRisk: number
  agingRisk: number
  maintenanceRisk: number
  overallIRI: number
  status: 'safe' | 'caution' | 'warning' | 'critical'
  trend: 'improving' | 'stable' | 'degrading'
}

const KEYS = {
  buildings: 'i2sf_buildings_v1',
  maintenance: 'i2sf_maintenance_v1',
  aging: 'i2sf_building_aging_v1',
  grid: 'i2sf_power_grid_v1',
  simulationRuns: 'i2sf_simulation_runs_v1',
  history: 'i2sf_iri_history_v1',
} as const

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function mean(values: number[]) {
  if (!values.length) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

export class IRIEngine {
  public calculateIRI(): IRIComponents {
    const gridRisk = this.calculateGridRisk()
    const stressRisk = this.calculateStressRisk()
    const agingRisk = this.calculateAgingRisk()
    const maintenanceRisk = this.calculateMaintenanceRisk()

    const overall = gridRisk * 0.3 + stressRisk * 0.25 + agingRisk * 0.25 + maintenanceRisk * 0.2
    const overallIRI = Math.round(clamp(overall, 0, 100) * 10) / 10

    const status = this.determineStatus(overallIRI)
    const trend = this.calculateTrend(overallIRI)

    return { gridRisk, stressRisk, agingRisk, maintenanceRisk, overallIRI, status, trend }
  }

  public recordSnapshot(): void {
    const iri = this.calculateIRI()
    const history = safeParse<Array<{ iri: number; timestamp: string }>>(localStorage.getItem(KEYS.history), [])

    history.push({ iri: iri.overallIRI, timestamp: new Date().toISOString() })

    while (history.length > 100) history.shift()

    localStorage.setItem(KEYS.history, JSON.stringify(history))
  }

  private calculateGridRisk(): number {
    const grid = safeParse<PowerGrid | null>(localStorage.getItem(KEYS.grid), null)
    const utilization = typeof grid?.utilization === 'number' ? grid.utilization : 0

    if (utilization <= 0) return 10
    if (utilization > 95) return 95
    if (utilization > 85) return 75
    if (utilization > 75) return 55
    if (utilization > 60) return 30
    return 15
  }

  private calculateStressRisk(): number {
    const buildings = safeParse<Building[]>(localStorage.getItem(KEYS.buildings), [])
    const occRates = buildings.map((b) => (typeof b.occupancyRate === 'number' ? b.occupancyRate : 0))

    // Stress based on:
    // - share of buildings above 85%
    // - plus "simulation high stress" runs recent (if present)
    const total = Math.max(1, buildings.length)
    const highCount = occRates.filter((r) => r > 85).length
    const base = clamp((highCount / total) * 100 * 1.5, 0, 95)

    const runs = safeParse<any[]>(localStorage.getItem(KEYS.simulationRuns), [])
    const since = Date.now() - 30 * 24 * 60 * 60 * 1000
    const recent = runs.filter((r) => {
      const t = r?.createdAt ? new Date(r.createdAt).getTime() : 0
      return t && t >= since
    })
    const highStressRuns = recent.filter((r) => String(r?.result?.stressLevel ?? '') === 'high').length

    const bump = clamp(highStressRuns * 4, 0, 20)
    return clamp(base + bump, 0, 95)
  }

  private calculateAgingRisk(): number {
    const agingObj = safeParse<Record<string, BuildingAge>>(localStorage.getItem(KEYS.aging), {})
    const ages = Object.values(agingObj)

    if (!ages.length) return 20

    // degradationFactor: 1 is best, lower is worse
    const avgDegradation = mean(ages.map((a) => clamp(1 - Number(a.degradationFactor ?? 0.85), 0, 1)))
    return clamp(avgDegradation * 200, 0, 95)
  }

  private calculateMaintenanceRisk(): number {
    const maintenance = safeParse<MaintenanceRecord[]>(localStorage.getItem(KEYS.maintenance), [])
    const pending = maintenance.filter((m) => m.status === 'pending' || m.status === 'in_progress')

    const critical = pending.filter((m) => m.priority === 'critical').length
    const high = pending.filter((m) => m.priority === 'high').length
    const medium = pending.filter((m) => m.priority === 'medium').length

    const score = critical * 15 + high * 8 + medium * 3
    return clamp(score, 0, 95)
  }

  private determineStatus(iri: number): 'safe' | 'caution' | 'warning' | 'critical' {
    if (iri < 30) return 'safe'
    if (iri < 50) return 'caution'
    if (iri < 70) return 'warning'
    return 'critical'
  }

  private calculateTrend(currentIRI: number): 'improving' | 'stable' | 'degrading' {
    const history = safeParse<Array<{ iri: number; timestamp: string }>>(localStorage.getItem(KEYS.history), [])
    if (history.length < 2) return 'stable'

    const recent = history.slice(-5).map((h) => h.iri)
    const avgRecent = mean(recent)

    if (currentIRI < avgRecent - 5) return 'improving'
    if (currentIRI > avgRecent + 5) return 'degrading'
    return 'stable'
  }
}

export const iriEngine = new IRIEngine()

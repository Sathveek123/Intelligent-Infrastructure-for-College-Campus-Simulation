import type { Building } from '@/types'
import type { BuildingDependency, DependencyImpact, OverflowEvent } from '@/types/dependencyModel'
import { fetchBuildings } from '@/services/mockData'

const DEPS_KEY = 'i2sf_building_dependencies_v1'
const HISTORY_KEY = 'i2sf_overflow_history_v1'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function safeParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export class DependencyEngine {
  private dependencies: Map<string, BuildingDependency> = new Map()
  private overflowHistory: OverflowEvent[] = []

  constructor() {
    this.loadDependencies()
    this.loadOverflowHistory()
    this.initializeDefaultDependencies()
  }

  private loadDependencies() {
    const saved = localStorage.getItem(DEPS_KEY)
    if (!saved) return
    const parsed = safeParse<Record<string, BuildingDependency>>(saved, {})
    this.dependencies = new Map(Object.entries(parsed))
  }

  private saveDependencies() {
    localStorage.setItem(DEPS_KEY, JSON.stringify(Object.fromEntries(this.dependencies)))
  }

  private loadOverflowHistory() {
    const saved = localStorage.getItem(HISTORY_KEY)
    if (!saved) return
    const parsed = safeParse<any[]>(saved, [])
    this.overflowHistory = parsed.map((x) => ({ ...x, timestamp: new Date(x.timestamp) }))
  }

  private saveOverflowHistory() {
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(this.overflowHistory.map((e) => ({ ...e, timestamp: new Date(e.timestamp).toISOString() }))),
    )
  }

  private initializeDefaultDependencies() {
    if (this.dependencies.size) return

    // Default logical dependencies for a campus: academic overflow to nearby academic blocks
    this.dependencies.set('CSE', { primaryBuildingId: 'CSE', backupBuildingIds: ['IT', 'ECE'], capacityShareRatio: 0.3, overflowThreshold: 85 })
    this.dependencies.set('ECE', { primaryBuildingId: 'ECE', backupBuildingIds: ['EEE', 'CSE'], capacityShareRatio: 0.25, overflowThreshold: 85 })
    this.dependencies.set('IT', { primaryBuildingId: 'IT', backupBuildingIds: ['CSE', 'ECE'], capacityShareRatio: 0.25, overflowThreshold: 85 })

    this.saveDependencies()
  }

  private guessKey(building: Building) {
    const code = `${building.buildingCode ?? ''} ${building.buildingName ?? ''}`.toUpperCase()
    if (code.includes('CSE')) return 'CSE'
    if (code.includes('ECE')) return 'ECE'
    if (code.includes('EEE')) return 'EEE'
    if (code.includes('IT')) return 'IT'
    return building.buildingCode?.toUpperCase() ?? building.id
  }

  private async findAvailableBackup(backupKeys: string[]) {
    const buildings = await fetchBuildings()

    for (const key of backupKeys) {
      const candidate = buildings.find((b) => this.guessKey(b) === key)
      if (!candidate) continue
      const occ = typeof candidate.occupancyRate === 'number' ? candidate.occupancyRate : 0
      if (occ < 75) return candidate
    }

    return null
  }

  public async checkForOverflow(building: Building) {
    const key = this.guessKey(building)
    const dep = this.dependencies.get(key)
    if (!dep) return null

    const occRate = typeof building.occupancyRate === 'number' ? building.occupancyRate : 0
    if (occRate <= dep.overflowThreshold) return null

    const totalCapacity = Math.max(1, (building.totalRooms ?? 1) * 40)
    const currentOcc = Math.round((occRate / 100) * totalCapacity)
    const thresholdOcc = Math.round((dep.overflowThreshold / 100) * totalCapacity)
    const overflow = Math.max(0, currentOcc - thresholdOcc)

    const target = await this.findAvailableBackup(dep.backupBuildingIds)
    if (!target) return null

    const redirected = Math.round(overflow * dep.capacityShareRatio)
    if (redirected <= 0) return null

    const event: OverflowEvent = {
      id: `overflow_${Date.now()}`,
      sourceBuildingId: building.id,
      sourceBuildingName: building.buildingName,
      targetBuildingId: target.id,
      targetBuildingName: target.buildingName,
      studentsRedirected: redirected,
      timestamp: new Date(),
      reason: 'Capacity overflow due to high utilization',
    }

    this.overflowHistory = [event, ...this.overflowHistory].slice(0, 100)
    this.saveOverflowHistory()

    return event
  }

  private calcStress(occupancy: number, capacity: number) {
    const rate = (occupancy / Math.max(1, capacity)) * 100
    if (rate > 90) return 3
    if (rate > 75) return 2
    if (rate > 50) return 1
    return 0
  }

  public calculateDependencyImpact(building: Building, additionalLoad: number): DependencyImpact {
    const capacity = Math.max(1, (building.totalRooms ?? 1) * 40)
    const occRate = typeof building.occupancyRate === 'number' ? building.occupancyRate : 0
    const originalLoad = Math.round((occRate / 100) * capacity)

    const totalLoad = originalLoad + additionalLoad
    const originalStress = this.calcStress(originalLoad, capacity)
    const newStress = this.calcStress(totalLoad, capacity)

    return {
      buildingId: building.id,
      originalLoad,
      additionalLoad,
      totalLoad,
      stressIncrease: newStress - originalStress,
      canAccommodate: totalLoad < capacity * 0.95,
    }
  }

  public getOverflowHistory(limit = 20) {
    return this.overflowHistory
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  }

  public getDependencies() {
    return Object.fromEntries(this.dependencies)
  }

  public setDependency(key: string, dep: BuildingDependency) {
    this.dependencies.set(key, dep)
    this.saveDependencies()
  }

  public removeDependency(key: string) {
    this.dependencies.delete(key)
    this.saveDependencies()
  }
}

export const dependencyEngine = new DependencyEngine()

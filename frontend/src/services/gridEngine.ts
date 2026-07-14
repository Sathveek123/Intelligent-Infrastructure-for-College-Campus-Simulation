import type { GridAlert, LoadSheddingPlan, PowerGrid, Transformer } from '@/types/gridModel'
import type { Building } from '@/types'
import { timeEngine } from '@/services/timeEngine'
import { eventEngine } from '@/services/eventEngine'
import { fetchBuildings } from '@/services/mockData'
import { powerControlService } from '@/services/powerControlService'

const GRID_KEY = 'i2sf_power_grid_v1'
const ALERTS_KEY = 'i2sf_grid_alerts_v1'

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

export class GridEngine {
  private grid: PowerGrid
  private listeners: Set<(grid: PowerGrid) => void> = new Set()

  constructor() {
    this.grid = this.initializeGrid()
    this.startMonitoring()
  }

  private initializeGrid(): PowerGrid {
    const saved = localStorage.getItem(GRID_KEY)
    if (saved) {
      const parsed = safeParse<PowerGrid>(saved, null as any)
      if (parsed) return parsed
    }

    return {
      totalCapacity: 3500,
      totalLoad: 0,
      utilization: 0,
      transformers: [
        {
          id: 'T1',
          name: 'Academic Block Transformer',
          capacity: 1500,
          currentLoad: 0,
          efficiency: 95,
          temperature: 45,
          buildingsServed: ['CSE', 'IT', 'ECE', 'EEE', 'AIML', 'AIDS', 'MECH'],
          status: 'normal',
        },
        {
          id: 'T2',
          name: 'Hostel & Workshop Transformer',
          capacity: 1200,
          currentLoad: 0,
          efficiency: 94,
          temperature: 48,
          buildingsServed: ['HOSTEL', 'VINDHYA', 'ARAVALI', 'NILGIRI', 'WORKSHOP'],
          status: 'normal',
        },
        {
          id: 'T3',
          name: 'Central Facilities Transformer',
          capacity: 800,
          currentLoad: 0,
          efficiency: 96,
          temperature: 42,
          buildingsServed: ['LIB', 'ADMIN', 'CANTEEN', 'SPORT'],
          status: 'normal',
        },
      ],
      backupPower: { available: true, capacity: 500, active: false },
      loadDistribution: { academic: 0, hostels: 0, central: 0, workshops: 0 },
    }
  }

  private saveGrid() {
    localStorage.setItem(GRID_KEY, JSON.stringify(this.grid))
  }

  private startMonitoring() {
    window.setInterval(() => {
      void this.updateGrid()
    }, 5000)
  }

  private async updateGrid() {
    const buildings = await fetchBuildings()
    const vt = timeEngine.getVirtualTime()
    const timeMult = timeEngine.getTimeMultipliers()
    const eventMult = eventEngine.getGlobalLoadMultipliers(new Date(vt.currentDate))

    const loadForBuilding = (b: Building) => {
      const control = powerControlService.get(b.id)
      const base = (b.baseEnergyLoad ?? 0) * (control.loadMultiplier ?? 1)
      const occ = typeof b.occupancyRate === 'number' ? b.occupancyRate : 0
      const occFactor = 0.6 + clamp(occ / 100, 0, 1)
      const adjusted = base * occFactor * timeMult.energyMultiplier * eventMult.energy
      const capped = control.supplyLimitKw == null ? adjusted : Math.min(adjusted, Math.max(0, control.supplyLimitKw))
      return Math.max(0, capped)
    }

    let totalLoad = 0
    const dist = { academic: 0, hostels: 0, central: 0, workshops: 0 }

    const loadsById = new Map<string, number>()
    for (const b of buildings) {
      const load = loadForBuilding(b)
      loadsById.set(b.id, load)
      totalLoad += load

      if (b.buildingType === 'academic') dist.academic += load
      else if (b.buildingType === 'hostel') dist.hostels += load
      else if (b.buildingType === 'administrative') dist.central += load
      else dist.workshops += load
    }

    this.grid.totalLoad = Math.round(totalLoad)
    this.grid.utilization = (this.grid.totalLoad / Math.max(1, this.grid.totalCapacity)) * 100
    this.grid.loadDistribution = {
      academic: Math.round(dist.academic),
      hostels: Math.round(dist.hostels),
      central: Math.round(dist.central),
      workshops: Math.round(dist.workshops),
    }

    this.distributeLoad(buildings, loadsById)
    this.checkGridStatus()

    this.saveGrid()
    this.notifyListeners()
  }

  private distributeLoad(buildings: Building[], loadsById: Map<string, number>) {
    this.grid.transformers.forEach((t) => (t.currentLoad = 0))

    for (const b of buildings) {
      const t = this.findTransformerForBuilding(this.grid.transformers, b)
      if (!t) continue
      t.currentLoad += loadsById.get(b.id) ?? 0
    }

    this.grid.transformers = this.grid.transformers.map((t) => ({
      ...t,
      currentLoad: Math.round(t.currentLoad),
      temperature: Math.round(40 + (t.currentLoad / Math.max(1, t.capacity)) * 35),
      status: this.determineTransformerStatus(t),
    }))
  }

  private findTransformerForBuilding(transformers: Transformer[], building: Building): Transformer {
    const code = `${building.buildingCode ?? ''} ${building.buildingName ?? ''}`.toUpperCase()

    const match = transformers.find((t) => t.buildingsServed.some((token) => code.includes(token)))
    return match ?? transformers[0]
  }

  private determineTransformerStatus(transformer: Transformer) {
    const utilization = (transformer.currentLoad / Math.max(1, transformer.capacity)) * 100
    if (utilization > 100) return 'tripped'
    if (utilization > 90) return 'overload'
    if (utilization > 75) return 'warning'
    return 'normal'
  }

  private checkGridStatus() {
    const alerts: GridAlert[] = []

    if (this.grid.utilization > 95) {
      alerts.push({
        level: 'critical',
        message: 'Campus-wide power capacity critically high',
        affectedTransformers: this.grid.transformers.map((t) => t.id),
        recommendedAction: 'Activate backup power and implement load shedding',
      })
    } else if (this.grid.utilization > 85) {
      alerts.push({
        level: 'warning',
        message: 'Power utilization above 85%',
        affectedTransformers: [],
        recommendedAction: 'Monitor closely and prepare load shedding plan',
      })
    }

    for (const t of this.grid.transformers) {
      if (t.status === 'overload' || t.status === 'tripped') {
        alerts.push({
          level: 'critical',
          message: `${t.name} is ${t.status}`,
          affectedTransformers: [t.id],
          recommendedAction: 'Reduce load on non-essential buildings and shift energy-heavy tasks',
        })
      }
    }

    localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts))
  }

  public getGrid() {
    return { ...this.grid }
  }

  public getAlerts(): GridAlert[] {
    const saved = localStorage.getItem(ALERTS_KEY)
    return saved ? safeParse<GridAlert[]>(saved, []) : []
  }

  public activateBackupPower() {
    if (!this.grid.backupPower.available || this.grid.backupPower.active) return
    this.grid.backupPower.active = true
    this.grid.totalCapacity += this.grid.backupPower.capacity
    this.saveGrid()
    this.notifyListeners()
  }

  public deactivateBackupPower() {
    if (!this.grid.backupPower.active) return
    this.grid.backupPower.active = false
    this.grid.totalCapacity -= this.grid.backupPower.capacity
    this.saveGrid()
    this.notifyListeners()
  }

  public generateLoadSheddingPlan(buildings: Building[]): LoadSheddingPlan[] {
    return buildings
      .map((b) => ({
        priority: this.calculatePriority(b),
        buildingId: b.id,
        buildingName: b.buildingName,
        currentLoad: Math.round((b.baseEnergyLoad ?? 0) * 1.0),
        essential: this.isEssential(b),
      }))
      .sort((a, b) => a.priority - b.priority)
  }

  private calculatePriority(building: Building): number {
    if (building.buildingType === 'hostel') return 5
    if (building.buildingType === 'administrative') return 4
    if (building.buildingName.toLowerCase().includes('lab')) return 3
    if (building.buildingName.toLowerCase().includes('workshop')) return 2
    return 1
  }

  private isEssential(building: Building): boolean {
    return building.buildingType === 'hostel' || building.buildingType === 'administrative'
  }

  public subscribe(listener: (grid: PowerGrid) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners() {
    this.listeners.forEach((l) => l(this.grid))
  }
}

export const gridEngine = new GridEngine()

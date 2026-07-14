import type { AgingImpact, BuildingAge } from '@/types/agingModel'
import type { Building } from '@/types'

const STORAGE_KEY = 'i2sf_building_aging_v1'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function safeParse(raw: string): Record<string, any> {
  try {
    const parsed = JSON.parse(raw) as Record<string, any>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export class AgingEngine {
  private agingData: Map<string, BuildingAge> = new Map()

  constructor() {
    this.loadAgingData()
  }

  private loadAgingData() {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return
    const data = safeParse(saved)

    this.agingData = new Map(
      Object.entries(data).map(([id, age]) => {
        const x = age as any
        return [
          id,
          {
            ...x,
            lastMajorRenovation: x.lastMajorRenovation ? new Date(x.lastMajorRenovation) : null,
          } as BuildingAge,
        ]
      }),
    )
  }

  private saveAgingData() {
    const data = Object.fromEntries(this.agingData)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  public initializeBuilding(building: Building) {
    if (this.agingData.has(building.id)) return

    const currentYear = new Date().getFullYear()
    const constructionYear = (building as any).constructionYear ? Number((building as any).constructionYear) : currentYear - 10
    const currentAge = Math.max(0, currentYear - constructionYear)

    const record: BuildingAge = {
      buildingId: building.id,
      constructionYear,
      currentAge,
      cumulativeUsageHours: currentAge * 2000,
      degradationFactor: this.calculateDegradationFactor(currentAge, currentAge * 2000),
      efficiencyLoss: this.calculateEfficiencyLoss(currentAge),
      maintenanceFrequency: this.calculateMaintenanceFrequency(currentAge),
      lastMajorRenovation: null,
      expectedLifespan: 50,
      remainingLifespan: Math.max(0, 50 - currentAge),
    }

    this.agingData.set(building.id, record)
    this.saveAgingData()
  }

  public recordUsage(buildingId: string, hours: number) {
    const aging = this.agingData.get(buildingId)
    if (!aging) return

    aging.cumulativeUsageHours += Math.max(0, hours)
    aging.degradationFactor = this.calculateDegradationFactor(aging.currentAge, aging.cumulativeUsageHours)
    aging.efficiencyLoss = this.calculateEfficiencyLoss(aging.currentAge)

    this.agingData.set(buildingId, aging)
    this.saveAgingData()
  }

  public recordMaintenance(buildingId: string, major = false) {
    const aging = this.agingData.get(buildingId)
    if (!aging) return

    if (major) {
      aging.lastMajorRenovation = new Date()
      aging.degradationFactor = clamp(aging.degradationFactor + 0.2, 0.4, 1)
      aging.efficiencyLoss = Math.max(0, aging.efficiencyLoss - 10)
    } else {
      aging.degradationFactor = clamp(aging.degradationFactor + 0.05, 0.4, 1)
    }

    this.agingData.set(buildingId, aging)
    this.saveAgingData()
  }

  private calculateDegradationFactor(age: number, usageHours: number) {
    const ageFactor = 1 - age * 0.015
    const usageFactor = 1 - usageHours / 1_000_000
    return clamp(ageFactor * usageFactor, 0.4, 1)
  }

  private calculateEfficiencyLoss(age: number) {
    if (age < 5) return 0
    if (age < 10) return 5
    if (age < 15) return 10
    if (age < 20) return 15
    if (age < 30) return 25
    return 35
  }

  private calculateMaintenanceFrequency(age: number) {
    if (age < 5) return 2
    if (age < 10) return 3
    if (age < 20) return 4
    return 6
  }

  public getAgingData(buildingId: string) {
    return this.agingData.get(buildingId)
  }

  public getAllAgingData() {
    return Array.from(this.agingData.values())
  }

  public calculateAgingImpact(buildingId: string): AgingImpact {
    const aging = this.agingData.get(buildingId)
    if (!aging) return { healthScoreAdjustment: 0, energyEfficiencyPenalty: 0, maintenanceProbabilityIncrease: 0, recommendedActions: [] }

    const healthScoreAdjustment = -(1 - aging.degradationFactor) * 20
    const energyEfficiencyPenalty = aging.efficiencyLoss
    const maintenanceProbabilityIncrease = aging.currentAge * 2

    const rec: string[] = []
    if (aging.degradationFactor < 0.7) rec.push('Major renovation recommended due to degradation')
    if (aging.efficiencyLoss > 20) rec.push('Energy efficiency upgrades needed (HVAC, lighting)')
    if (aging.currentAge > 25 && !aging.lastMajorRenovation) rec.push('No major renovation recorded in 25+ years')
    if (aging.remainingLifespan < 10) rec.push('Approaching end of expected lifespan')

    return { healthScoreAdjustment, energyEfficiencyPenalty, maintenanceProbabilityIncrease, recommendedActions: rec }
  }

  public ensureBuildings(buildings: Building[]) {
    buildings.forEach((b) => this.initializeBuilding(b))
  }
}

export const agingEngine = new AgingEngine()

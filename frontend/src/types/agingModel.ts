export interface BuildingAge {
  buildingId: string
  constructionYear: number
  currentAge: number
  cumulativeUsageHours: number
  degradationFactor: number
  efficiencyLoss: number
  maintenanceFrequency: number
  lastMajorRenovation: Date | null
  expectedLifespan: number
  remainingLifespan: number
}

export interface AgingImpact {
  healthScoreAdjustment: number
  energyEfficiencyPenalty: number
  maintenanceProbabilityIncrease: number
  recommendedActions: string[]
}

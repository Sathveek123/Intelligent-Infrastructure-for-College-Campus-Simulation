export interface BuildingDependency {
  primaryBuildingId: string
  backupBuildingIds: string[]
  capacityShareRatio: number
  overflowThreshold: number
}

export interface OverflowEvent {
  id: string
  sourceBuildingId: string
  sourceBuildingName: string
  targetBuildingId: string
  targetBuildingName: string
  studentsRedirected: number
  timestamp: Date
  reason: string
}

export interface DependencyImpact {
  buildingId: string
  originalLoad: number
  additionalLoad: number
  totalLoad: number
  stressIncrease: number
  canAccommodate: boolean
}

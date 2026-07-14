export interface Transformer {
  id: string
  name: string
  capacity: number
  currentLoad: number
  efficiency: number
  temperature: number
  buildingsServed: string[]
  status: 'normal' | 'warning' | 'overload' | 'tripped'
}

export interface PowerGrid {
  totalCapacity: number
  totalLoad: number
  utilization: number
  transformers: Transformer[]
  backupPower: {
    available: boolean
    capacity: number
    active: boolean
  }
  loadDistribution: {
    academic: number
    hostels: number
    central: number
    workshops: number
  }
}

export interface LoadSheddingPlan {
  priority: number
  buildingId: string
  buildingName: string
  currentLoad: number
  essential: boolean
}

export interface GridAlert {
  level: 'info' | 'warning' | 'critical'
  message: string
  affectedTransformers: string[]
  recommendedAction: string
}

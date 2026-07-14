export interface Building {
  id: string
  buildingName: string
  buildingCode: string
  totalFloors: number
  totalRooms: number
  constructionYear: number
  buildingType: 'academic' | 'administrative' | 'hostel' | 'laboratory'
  baseEnergyLoad: number
  occupancyRate?: number
}

export interface Room {
  id: string
  buildingId: string
  buildingName?: string
  roomNumber: string
  floor: number
  capacity: number
  roomType: 'classroom' | 'lab' | 'seminar_hall' | 'hostel_room' | 'office'
  equipmentList?: string
  status: 'available' | 'occupied' | 'maintenance'
  currentOccupancy?: number
  utilizationRate?: number
}

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'staff'
  isActive: boolean
  createdAt: string
}

export interface MaintenanceRecord {
  id: string
  type: 'building' | 'room'
  targetId: string
  targetName: string
  maintenanceDate: string
  issueDescription: string
  resolution?: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  status: 'pending' | 'in_progress' | 'completed'
  cost?: number
  createdBy: string

  isPredicted?: boolean
  predictedReason?: string | null
  predictedAt?: string | null
  predictionConfidence?: number | null
  predictionSource?: 'health_score' | 'stress_analysis' | 'occupancy_threshold' | 'energy_threshold' | null
  isDismissed?: boolean
  dismissedBy?: string | null
  dismissedAt?: string | null
  dismissalReason?: string | null
}

export interface PredictedMaintenance {
  id: string
  buildingId: string
  buildingName?: string
  buildingCode?: string
  predictedAt?: string
  predictedReason?: string
  confidence?: number
  source?: 'health_score' | 'stress_analysis' | 'occupancy_threshold' | 'energy_threshold'
  priority: 'critical' | 'high' | 'medium' | 'low'
  estimatedDate: string
  status: 'pending' | 'in_progress' | 'completed'
}

export interface BuildingMetrics {
  buildingId: string
  buildingName: string
  buildingCode: string
  buildingType: 'academic' | 'administrative' | 'hostel' | 'laboratory'
  healthScore: number
  healthStatus: 'healthy' | 'moderate' | 'critical'
  components: {
    occupancyEfficiency: number
    energyEfficiency: number
    maintenanceHealth: number
  }
  lastCalculated: string
}

export interface HealthSnapshot {
  date: string
  healthScore: number
  healthStatus: 'healthy' | 'moderate' | 'critical'
  components: {
    occupancyEfficiency: number
    energyEfficiency: number
    maintenanceHealth: number
  }
}

export interface HealthTrend {
  direction: 'improving' | 'declining' | 'stable'
  averageChange: number
  movingAverage7Day: number
  movingAverage30Day: number
}

export interface HealthAnomaly {
  date: string
  type: 'sudden_drop' | 'sustained_decline' | 'status_downgrade'
  description: string
  severity: 'high' | 'medium' | 'low'
}

export interface BuildingHealthOverview {
  buildingId: string
  buildingName: string
  currentScore: number
  currentStatus: 'healthy' | 'moderate' | 'critical'
  scoreChange7Day: number
  trend: 'improving' | 'declining' | 'stable'
}

export interface CorrelationData {
  dates: string[]
  energyEfficiency: number[]
  occupancyEfficiency: number[]
  correlation: number
  insight: string
}

export type AuditLogAction =
  | 'login'
  | 'logout'
  | 'failed_login'
  | 'create'
  | 'update'
  | 'delete'
  | 'read'
  | 'simulation_run'
  | 'metrics_calculated'
  | 'prediction_generated'
  | 'prediction_converted'
  | 'prediction_dismissed'
  | 'export_csv'
  | 'export_pdf'

export type AuditLogEntity = 'user' | 'building' | 'room' | 'maintenance' | 'simulation' | 'metrics' | 'prediction' | 'audit_log'

export type AuditLogResult = 'success' | 'failure'

export interface AuditLog {
  id: string
  actorId?: string | null
  actorEmail?: string | null
  actorRole: 'admin' | 'staff' | 'system'
  action: AuditLogAction
  entity: AuditLogEntity
  entityId?: string | null
  entityName?: string | null
  changes?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
  result: AuditLogResult
  errorMessage?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  timestamp: string
}

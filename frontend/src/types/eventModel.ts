export type EventType =
  | 'technical_fest'
  | 'cultural_fest'
  | 'placement_drive'
  | 'workshop'
  | 'seminar'
  | 'sports_event'
  | 'exam'
  | 'conference'

export type EventImpact = 'low' | 'medium' | 'high' | 'critical'

export interface CampusEvent {
  id: string
  name: string
  type: EventType
  startDate: Date
  endDate: Date
  startTime: string
  endTime: string
  buildingsAffected: string[]
  expectedAttendance: number
  description: string
  impact: EventImpact
  loadMultipliers: {
    occupancy: number
    energy: number
    ac: number
    lighting: number
  }
  active: boolean
  createdAt: Date
}

export interface EventImpactResult {
  eventId: string
  eventName: string
  buildingId: string
  buildingName: string
  normalOccupancy: number
  eventOccupancy: number
  normalEnergy: number
  eventEnergy: number
  stressIncrease: number
  recommendations: string[]
}

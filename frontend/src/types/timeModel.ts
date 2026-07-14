export type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'night'
export type DayType = 'weekday' | 'weekend' | 'holiday'
export type CampusMode = 'regular' | 'exam' | 'event' | 'vacation' | 'maintenance'

export interface VirtualTime {
  currentDate: Date
  currentHour: number
  timeSlot: TimeSlot
  dayType: DayType
  campusMode: CampusMode
  academicWeek: number
  isExamWeek: boolean
}

export interface TimeMultipliers {
  occupancyMultiplier: number
  energyMultiplier: number
  acLoadMultiplier: number
  labUsageMultiplier: number
}

export interface TimeSlotConfig {
  slot: TimeSlot
  hours: [number, number]
  defaultOccupancy: number
  energyFactor: number
  acUsage: number
  labActivity: number
}

export interface CampusModeConfig {
  mode: CampusMode
  occupancyAdjustment: number
  energyAdjustment: number
  description: string
  typical: string[]
}

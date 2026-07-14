import { timeEngine } from '@/services/timeEngine'
import type { Building } from '@/types'

export interface TimeAwareOccupancyResult {
  baseOccupancy: number
  timeAdjustedOccupancy: number
  multiplier: number
  timeSlot: string
  campusMode: string
  reasoning: string[]
}

export interface TimeAwareEnergyResult {
  baseEnergy: number
  timeAdjustedEnergy: number
  multiplier: number
  breakdown: {
    classrooms: number
    labs: number
    ac: number
    lighting: number
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function estimateBuildingCapacity(building: Building) {
  const rooms = typeof building.totalRooms === 'number' ? building.totalRooms : 0
  const perRoom = 40
  return Math.max(1, rooms * perRoom)
}

export function calculateTimeAwareOccupancy(building: Building, baseStudentCount: number): TimeAwareOccupancyResult {
  const virtualTime = timeEngine.getVirtualTime()
  const multipliers = timeEngine.getTimeMultipliers()

  const capacity = estimateBuildingCapacity(building)
  const adjustedCount = Math.round(baseStudentCount * multipliers.occupancyMultiplier)
  const occupancyRate = clamp((adjustedCount / capacity) * 100, 0, 100)

  const reasoning: string[] = []
  reasoning.push(`${virtualTime.timeSlot} period: ${(multipliers.occupancyMultiplier * 100).toFixed(0)}% typical occupancy`)

  const modeConfig = timeEngine.getCampusModeConfig()
  reasoning.push(`${modeConfig.description}: ${(modeConfig.occupancyAdjustment * 100).toFixed(0)}% adjustment`)

  if (virtualTime.dayType === 'weekend') {
    reasoning.push('Weekend: Reduced activity (30% of weekday)')
  }

  return {
    baseOccupancy: clamp((baseStudentCount / capacity) * 100, 0, 100),
    timeAdjustedOccupancy: occupancyRate,
    multiplier: multipliers.occupancyMultiplier,
    timeSlot: virtualTime.timeSlot,
    campusMode: virtualTime.campusMode,
    reasoning,
  }
}

export function calculateTimeAwareEnergy(building: Building, occupancyRate: number): TimeAwareEnergyResult {
  const multipliers = timeEngine.getTimeMultipliers()

  const baseEnergy = building.baseEnergyLoad ?? 0
  const rooms = typeof building.totalRooms === 'number' ? building.totalRooms : 0

  const occupancyFactor = 0.5 + clamp(occupancyRate / 100, 0, 1)

  const classroomEnergy = rooms * 1.9 * multipliers.energyMultiplier * occupancyFactor
  const labEnergy = rooms * 0.6 * multipliers.labUsageMultiplier * occupancyFactor
  const acEnergy = baseEnergy * 0.4 * multipliers.acLoadMultiplier * occupancyFactor
  const lightingEnergy = baseEnergy * 0.2 * multipliers.energyMultiplier

  const totalEnergy = classroomEnergy + labEnergy + acEnergy + lightingEnergy

  return {
    baseEnergy,
    timeAdjustedEnergy: Math.max(0, totalEnergy),
    multiplier: multipliers.energyMultiplier,
    breakdown: {
      classrooms: Math.max(0, classroomEnergy),
      labs: Math.max(0, labEnergy),
      ac: Math.max(0, acEnergy),
      lighting: Math.max(0, lightingEnergy),
    },
  }
}

export interface OccupancySimulationInput {
  buildingId: string
  totalStudents: number
  rooms: Array<{ id: string; capacity: number }>
}

export interface OccupancySimulationOutput {
  buildingId: string
  totalCapacity: number
  totalStudents: number
  occupancyRate: number
  roomOccupancy: Array<{
    roomId: string
    assignedStudents: number
    capacity: number
    utilizationRate: number
    status: 'under_utilized' | 'optimal' | 'over_utilized'
  }>
  stressLevel: 'low' | 'medium' | 'high'
  recommendations: string[]
}

export function runOccupancySimulation(input: OccupancySimulationInput): OccupancySimulationOutput {
  const totalCapacity = input.rooms.reduce((sum, r) => sum + r.capacity, 0)
  const totalStudents = Math.max(0, Math.floor(input.totalStudents))

  if (totalCapacity <= 0) {
    return {
      buildingId: input.buildingId,
      totalCapacity: 0,
      totalStudents,
      occupancyRate: 0,
      roomOccupancy: input.rooms.map((r) => ({
        roomId: r.id,
        assignedStudents: 0,
        capacity: r.capacity,
        utilizationRate: 0,
        status: 'under_utilized',
      })),
      stressLevel: 'low',
      recommendations: ['No capacity available. Add rooms or fix room capacities.'],
    }
  }

  if (totalStudents > totalCapacity) {
    // Keep as a simulation-level error for the controller to return.
    throw new Error(`Total students (${totalStudents}) exceeds building capacity (${totalCapacity})`)
  }

  // Smart distribution: fill bigger rooms first to ~70%, then top-up to avoid over-utilization.
  const sorted = [...input.rooms].sort((a, b) => b.capacity - a.capacity)

  const dist = sorted.map((r) => ({ roomId: r.id, capacity: r.capacity, assignedStudents: 0 }))
  let remaining = totalStudents

  // Pass 1: target 70% fill.
  for (const room of dist) {
    if (remaining <= 0) break
    const target = Math.floor(room.capacity * 0.7)
    const assigned = Math.min(target, remaining)
    room.assignedStudents = assigned
    remaining -= assigned
  }

  // Pass 2: round-robin top-up by available space.
  let guard = 0
  while (remaining > 0 && guard < 100000) {
    guard++
    let progressed = false

    for (const room of dist) {
      if (remaining <= 0) break
      const spaceLeft = room.capacity - room.assignedStudents
      if (spaceLeft <= 0) continue

      room.assignedStudents += 1
      remaining -= 1
      progressed = true
    }

    if (!progressed) break
  }

  function getRoomStatus(utilizationRate: number): 'under_utilized' | 'optimal' | 'over_utilized' {
    if (utilizationRate < 50) return 'under_utilized'
    if (utilizationRate > 85) return 'over_utilized'
    return 'optimal'
  }

  const roomOccupancy = dist.map((r) => {
    const utilizationRate = r.capacity > 0 ? (r.assignedStudents / r.capacity) * 100 : 0
    const util = Number(utilizationRate.toFixed(2))
    return {
      roomId: r.roomId,
      assignedStudents: r.assignedStudents,
      capacity: r.capacity,
      utilizationRate: util,
      status: getRoomStatus(util),
    }
  })

  const occupancyRate = (totalStudents / totalCapacity) * 100

  const overUtilizedRooms = roomOccupancy.filter((r) => r.status === 'over_utilized').length
  const overUtilizedPct = roomOccupancy.length > 0 ? (overUtilizedRooms / roomOccupancy.length) * 100 : 0
  const stressLevel: 'low' | 'medium' | 'high' =
    occupancyRate > 85 || overUtilizedPct > 30 ? 'high' : occupancyRate > 70 || overUtilizedPct > 15 ? 'medium' : 'low'

  const recommendations: string[] = []
  if (stressLevel === 'high') {
    recommendations.push('High occupancy stress detected. Consider opening additional rooms or scheduling adjustments.')
  }

  const underUtilized = roomOccupancy.filter((r) => r.status === 'under_utilized').length
  if (underUtilized > roomOccupancy.length * 0.3) {
    recommendations.push('Many rooms are under-utilized. Consider consolidating classes to improve efficiency.')
  }

  if (overUtilizedRooms > 0) {
    recommendations.push('Some rooms are over-utilized (>85%). Redistribute students for better comfort and safety.')
  }

  if (occupancyRate < 60) {
    recommendations.push('Building has significant capacity available for expansion or additional scheduling.')
  }

  if (recommendations.length === 0) {
    recommendations.push('Occupancy distribution looks healthy. Continue monitoring.')
  }
  return {
    buildingId: input.buildingId,
    totalCapacity,
    totalStudents,
    occupancyRate: Number(occupancyRate.toFixed(2)),
    roomOccupancy,
    stressLevel,
    recommendations,
  }
}

export interface EnergySimulationInput {
  buildingId: string
  baseEnergyLoad: number
  rooms: Array<{ id: string; studentCount: number; equipmentLoad: number }>
  perStudentEnergyFactor: number
}

export interface EnergySimulationOutput {
  buildingId: string
  baseLoad: number
  studentLoad: number
  equipmentLoad: number
  totalEnergyConsumption: number
  roomEnergyBreakdown: Array<{ roomId: string; energyUsage: number; studentCount: number; equipmentLoad: number }>
  exceedsThreshold: boolean
  efficiencyScore: number
  recommendations: string[]
}

export function runEnergySimulation(input: EnergySimulationInput): EnergySimulationOutput {
  const baseLoad = Number(input.baseEnergyLoad) || 0
  const perStudent = Number(input.perStudentEnergyFactor) || 0.15

  const roomEnergyBreakdown = input.rooms.map((r) => {
    const studentLoad = (Number(r.studentCount) || 0) * perStudent
    const equipmentLoad = Number(r.equipmentLoad) || 0
    const energyUsage = studentLoad + equipmentLoad
    return {
      roomId: r.id,
      energyUsage: Number(energyUsage.toFixed(2)),
      studentCount: Number(r.studentCount) || 0,
      equipmentLoad,
    }
  })

  const studentLoad = input.rooms.reduce((sum, r) => sum + (Number(r.studentCount) || 0) * perStudent, 0)
  const equipmentLoad = input.rooms.reduce((sum, r) => sum + (Number(r.equipmentLoad) || 0), 0)
  const totalEnergyConsumption = baseLoad + studentLoad + equipmentLoad

  const threshold = Number(process.env.ENERGY_WARNING_THRESHOLD) || 1000

  // Efficiency (0-100): compare against a soft optimal of 30% above base load.
  const optimal = baseLoad * 1.3
  const efficiencyScore = optimal > 0 ? Math.max(0, Math.min(100, (optimal / totalEnergyConsumption) * 100)) : 0

  const recommendations: string[] = []
  const exceedsThreshold = totalEnergyConsumption > threshold

  if (exceedsThreshold) {
    recommendations.push('Energy consumption exceeds threshold. Implement energy-saving measures immediately.')
  }

  if (efficiencyScore < 60) {
    recommendations.push('Low energy efficiency. Consider upgrading to LED lighting and smart HVAC systems.')
  }

  const topRooms = [...roomEnergyBreakdown]
    .sort((a, b) => b.energyUsage - a.energyUsage)
    .slice(0, 3)
    .filter((r) => r.energyUsage > 0)

  if (topRooms.length > 0) {
    recommendations.push('Focus optimization on the highest energy-consuming rooms (top 3).')
  }

  if (efficiencyScore > 80 && !exceedsThreshold) {
    recommendations.push('Excellent energy efficiency. Maintain current practices.')
  }

  if (recommendations.length === 0) recommendations.push('Energy profile looks stable. Continue monitoring.')

  return {
    buildingId: input.buildingId,
    baseLoad: Number(baseLoad.toFixed(2)),
    studentLoad: Number(studentLoad.toFixed(2)),
    equipmentLoad: Number(equipmentLoad.toFixed(2)),
    totalEnergyConsumption: Number(totalEnergyConsumption.toFixed(2)),
    roomEnergyBreakdown,
    exceedsThreshold,
    efficiencyScore: Number(efficiencyScore.toFixed(2)),
    recommendations,
  }
}

export interface StressTestInput {
  buildingId: string
  maxCapacityScenario: number
  rooms: Array<{ id: string; capacity: number }>
}

export interface StressTestOutput {
  buildingId: string
  maxCapacity: number
  projectedOccupancy: number
  bottlenecks: Array<{ roomId: string; issue: string; recommendation: string }>
  infrastructureStressScore: number
  stressLevel: 'low' | 'medium' | 'high'
  recommendations: string[]
}

export function runStressTest(input: StressTestInput): StressTestOutput {
  const maxCapacity = input.rooms.reduce((sum, r) => sum + r.capacity, 0)
  const scenario = Math.max(0, Math.floor(input.maxCapacityScenario))
  const projectedOccupancy = maxCapacity > 0 ? (scenario / maxCapacity) * 100 : 0

  const bottlenecks = input.rooms
    .filter((r) => r.capacity > 0 && r.capacity < 30)
    .map((r) => ({
      roomId: r.id,
      issue: 'Low-capacity room may cause congestion under peak load',
      recommendation: 'Consider combining sessions or reallocating to higher-capacity rooms',
    }))

  const score = Math.max(0, Math.min(100, projectedOccupancy))

  const stressLevel: 'low' | 'medium' | 'high' = score > 85 ? 'high' : score > 70 ? 'medium' : 'low'
  const recommendations: string[] = []
  if (stressLevel === 'high') recommendations.push('Critical projected load. Plan immediate capacity and energy upgrades.')
  if (stressLevel === 'medium') recommendations.push('Moderate stress projected. Consider phased improvements and monitoring.')
  if (stressLevel === 'low') recommendations.push('Projected load is manageable. Continue regular monitoring.')

  for (const b of bottlenecks.slice(0, 5)) recommendations.push(b.recommendation)

  return {
    buildingId: input.buildingId,
    maxCapacity,
    projectedOccupancy: Number(projectedOccupancy.toFixed(2)),
    bottlenecks,
    infrastructureStressScore: Number(score.toFixed(2)),
    stressLevel,
    recommendations,
  }
}

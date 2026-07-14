import type { ApiFailure } from './types'
import { fetchBuildings, fetchRooms } from '@/services/mockData'
import { calculateTimeAwareEnergy, calculateTimeAwareOccupancy } from '@/services/timeAwareSimulation'
import { timeEngine } from '@/services/timeEngine'

type ApiSuccess<T> = { success: true; data: T }
type ApiResponse<T> = ApiSuccess<T> | ApiFailure

export type SimulationType = 'occupancy' | 'energy' | 'stress_test'

export type SimulationRunLite = {
  id: string
  simulationType: SimulationType
  createdAt: string
  building?: { id: string; buildingName: string; buildingCode: string } | null
  creator?: { id: string; name: string; email: string; role: string } | null
}

export type SimulationRunDetails = SimulationRunLite & {
  payload: Record<string, unknown>
  result: Record<string, unknown>
}

const STORAGE_KEY = 'i2sf_simulation_runs_v1'

function readRuns(): SimulationRunDetails[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as SimulationRunDetails[]
  } catch {
    return []
  }
}

function writeRuns(next: SimulationRunDetails[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

async function hydrateBuilding(buildingId: string) {
  const buildings = await fetchBuildings()
  const b = buildings.find((x) => x.id === buildingId)
  if (!b) throw new Error('Building not found')
  return b
}

async function getBuildingRooms(buildingId: string) {
  const rooms = await fetchRooms()
  return rooms.filter((r) => r.buildingId === buildingId)
}

function storeRun(run: SimulationRunDetails) {
  const existing = readRuns()
  writeRuns([run, ...existing])
}

export async function fetchSimulationRunDetails(id: string): Promise<SimulationRunDetails> {
  const all = readRuns()
  const found = all.find((r) => r.id === id)
  if (!found) throw new Error('Simulation run not found')
  return found
}

export async function fetchAllSimulationRunDetails(): Promise<SimulationRunDetails[]> {
  return readRuns()
}

export type SimulationHistoryResponse = {
  data: SimulationRunLite[]
  total: number
  page: number
  totalPages: number
  limit: number
}

export type OccupancySimulationResult = {
  occupancyRate?: number
  stressLevel?: 'low' | 'medium' | 'high'
  recommendations?: string[]
  roomDistributions?: unknown
  [k: string]: unknown
}

export type EnergySimulationResult = {
  totalEnergyConsumption?: number
  efficiencyScore?: number
  recommendations?: string[]
  [k: string]: unknown
}

export type StressTestResult = {
  stressLevel?: 'low' | 'medium' | 'high'
  bottlenecks?: unknown
  recommendations?: string[]
  [k: string]: unknown
}

type SimulationHistoryApiSuccess = {
  success: true
  data: SimulationRunLite[]
  total: number
  page: number
  totalPages: number
  limit: number
}

type SimulationHistoryApiResponse = SimulationHistoryApiSuccess | ApiFailure

export async function runOccupancySimulation(payload: { buildingId: string; totalStudents: number }) {
  const building = await hydrateBuilding(payload.buildingId)
  const rooms = await getBuildingRooms(payload.buildingId)
  const capacity = rooms.reduce((a, r) => a + (r.capacity ?? 0), 0) || building.totalRooms * 40 || 1
  const timeOcc = calculateTimeAwareOccupancy(building as any, payload.totalStudents)
  const adjustedStudents = Math.round(payload.totalStudents * timeOcc.multiplier)
  const occupancyRate = clamp((adjustedStudents / capacity) * 100, 0, 100)
  const stressLevel: 'low' | 'medium' | 'high' = occupancyRate >= 90 ? 'high' : occupancyRate >= 70 ? 'medium' : 'low'
  const recommendations =
    stressLevel === 'high'
      ? ['Open additional classrooms/labs', 'Stagger schedules during peak hours', 'Enable overflow seating plans']
      : stressLevel === 'medium'
        ? ['Monitor peak rooms', 'Optimize timetable to balance utilization']
        : ['Utilization is within safe operating levels']

  const result: OccupancySimulationResult = {
    occupancyRate: Math.round(occupancyRate * 10) / 10,
    stressLevel,
    recommendations: [...(timeOcc.reasoning ?? []), ...recommendations],
    timeAware: {
      baseStudents: payload.totalStudents,
      adjustedStudents,
      multiplier: timeOcc.multiplier,
      timeSlot: timeOcc.timeSlot,
      campusMode: timeOcc.campusMode,
      virtualTime: timeEngine.getVirtualTime(),
    },
  }

  const run: SimulationRunDetails = {
    id: `sim_${Math.random().toString(16).slice(2, 10)}`,
    simulationType: 'occupancy',
    createdAt: new Date().toISOString(),
    building: { id: building.id, buildingName: building.buildingName, buildingCode: building.buildingCode },
    creator: { id: 'u1', name: 'Campus Admin', email: 'admin@college.edu', role: 'admin' },
    payload: {
      ...payload,
      timeContext: timeEngine.getVirtualTime(),
      timeMultipliers: timeEngine.getTimeMultipliers(),
    },
    result,
  }
  storeRun(run)

  return result
}

export async function runEnergySimulation(payload: { buildingId: string; roomOccupancyData: Array<{ roomId: string; studentCount: number; equipmentLoad: number }> }) {
  const building = await hydrateBuilding(payload.buildingId)
  const base = building.baseEnergyLoad ?? 0
  const variable = payload.roomOccupancyData.reduce((a, x, idx) => {
    const studentFactor = clamp(x.studentCount, 0, 200) * 0.12
    const equipFactor = clamp(x.equipmentLoad, 0, 50) * 1.5
    const noise = (seededRandom(idx + base + x.studentCount) - 0.5) * 2
    return a + studentFactor + equipFactor + noise
  }, 0)
  const rawTotalEnergy = Math.max(0, Math.round(base + variable))
  const avgOcc = payload.roomOccupancyData.length
    ? payload.roomOccupancyData.reduce((a, x) => a + clamp(x.studentCount, 0, 200), 0) / payload.roomOccupancyData.length
    : 0
  const occRateGuess = clamp((avgOcc / 40) * 100, 0, 100)
  const timeEnergy = calculateTimeAwareEnergy(building as any, occRateGuess)
  const totalEnergyConsumption = Math.max(0, Math.round(rawTotalEnergy * timeEnergy.multiplier))
  const efficiencyScore = clamp(Math.round(100 - totalEnergyConsumption / 15), 0, 100)
  const recommendations =
    efficiencyScore < 50
      ? ['Shift heavy equipment usage off-peak', 'Enable smart AC scheduling', 'Audit lab device idle consumption']
      : ['Energy usage within expected range']

  const result: EnergySimulationResult = {
    totalEnergyConsumption,
    efficiencyScore,
    recommendations: [
      `Time slot: ${timeEngine.getVirtualTime().timeSlot} • Mode: ${timeEngine.getVirtualTime().campusMode}`,
      `Energy multiplier applied: ${(timeEnergy.multiplier * 100).toFixed(0)}%`,
      ...recommendations,
    ],
    timeAware: {
      baseEnergy: rawTotalEnergy,
      adjustedEnergy: totalEnergyConsumption,
      multiplier: timeEnergy.multiplier,
      breakdown: timeEnergy.breakdown,
      virtualTime: timeEngine.getVirtualTime(),
    },
  }
  const run: SimulationRunDetails = {
    id: `sim_${Math.random().toString(16).slice(2, 10)}`,
    simulationType: 'energy',
    createdAt: new Date().toISOString(),
    building: { id: building.id, buildingName: building.buildingName, buildingCode: building.buildingCode },
    creator: { id: 'u1', name: 'Campus Admin', email: 'admin@college.edu', role: 'admin' },
    payload: {
      ...payload,
      timeContext: timeEngine.getVirtualTime(),
      timeMultipliers: timeEngine.getTimeMultipliers(),
    },
    result,
  }
  storeRun(run)
  return result
}

export async function runStressTest(payload: { buildingId: string; maxCapacityScenario?: number }) {
  const building = await hydrateBuilding(payload.buildingId)
  const rooms = await getBuildingRooms(payload.buildingId)
  const capacity = rooms.reduce((a, r) => a + (r.capacity ?? 0), 0) || building.totalRooms * 40 || 1
  const scenario = payload.maxCapacityScenario ?? Math.round(capacity * 1.1)
  const overload = scenario / capacity
  const stressLevel: 'low' | 'medium' | 'high' = overload >= 1.25 ? 'high' : overload >= 1.1 ? 'medium' : 'low'
  const recommendations =
    stressLevel === 'high'
      ? ['Add temporary classrooms', 'Increase ventilation & crowd control staff', 'Reduce intake for peak slots']
      : stressLevel === 'medium'
        ? ['Stagger lab batches', 'Use seminar halls as overflow', 'Increase monitoring during peaks']
        : ['Infrastructure can handle the scenario']

  const result: StressTestResult = { stressLevel, recommendations }
  const run: SimulationRunDetails = {
    id: `sim_${Math.random().toString(16).slice(2, 10)}`,
    simulationType: 'stress_test',
    createdAt: new Date().toISOString(),
    building: { id: building.id, buildingName: building.buildingName, buildingCode: building.buildingCode },
    creator: { id: 'u1', name: 'Campus Admin', email: 'admin@college.edu', role: 'admin' },
    payload,
    result,
  }
  storeRun(run)
  return result
}

export async function fetchSimulationHistory(params?: { page?: number; limit?: number; buildingId?: string; type?: string }) {
  const page = Math.max(1, Math.floor(params?.page ?? 1))
  const limit = Math.max(1, Math.floor(params?.limit ?? 10))
  const buildingId = (params?.buildingId ?? '').trim()
  const type = (params?.type ?? '').trim().toLowerCase()

  const all = readRuns().filter((r) => {
    if (buildingId && r.building?.id !== buildingId) return false
    if (type && r.simulationType !== type) return false
    return true
  })

  const total = all.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const clampedPage = Math.min(page, totalPages)
  const start = (clampedPage - 1) * limit
  const data = all.slice(start, start + limit).map<SimulationRunLite>(({ payload: _p, result: _r, ...lite }) => lite)

  const response: SimulationHistoryResponse = { data, total, page: clampedPage, totalPages, limit }
  return response
}

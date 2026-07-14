import type { Request, Response } from 'express'
import Building from '../models/Building'
import OccupancyRecord from '../models/OccupancyRecord'
import Room from '../models/Room'
import SimulationRun from '../models/SimulationRun'
import User from '../models/User'
import { asyncHandler } from '../utils/asyncHandler'
import { runEnergySimulation, runOccupancySimulation, runStressTest } from '../services/simulationEngine'
import { metricsService } from '../services/metricsService'
import { auditService } from '../services/auditService'
import { logger } from '../utils/logger'

export const occupancy = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' })

  const { buildingId, totalStudents } = req.body as { buildingId?: string; totalStudents?: number }
  if (!buildingId || totalStudents === undefined) {
    return res.status(400).json({ success: false, error: 'buildingId and totalStudents are required' })
  }

  const building = await Building.findByPk(buildingId)
  if (!building) return res.status(400).json({ success: false, error: 'Invalid buildingId' })

  const rooms = await Room.findAll({ where: { buildingId } })
  const output = runOccupancySimulation({
    buildingId,
    totalStudents: Number(totalStudents),
    rooms: rooms.map((r) => ({ id: r.id, capacity: r.capacity })),
  })

  // Persist run
  const run = await SimulationRun.create({
    buildingId,
    simulationType: 'occupancy',
    inputParameters: { buildingId, totalStudents },
    outputResults: output,
    totalStudents: output.totalStudents,
    averageOccupancyRate: output.occupancyRate,
    stressLevel: output.stressLevel,
    createdBy: req.user.id,
  } as any)

  auditService
    .logSimulation(req.user.id, run.id, 'occupancy', building.buildingName, req.ip, req.get('user-agent') ?? undefined)
    .catch((error) => {
      logger.error('Failed to write audit log', { error })
    })

  // Persist occupancy records (today)
  const recordDate = new Date().toISOString().slice(0, 10)
  const timeSlot = '09:00-10:00'

  const byRoom = new Map(output.roomOccupancy.map((r) => [r.roomId, r]))
  for (const room of rooms) {
    const occ = byRoom.get(room.id)
    if (!occ) continue

    await room.update({ currentOccupancy: occ.assignedStudents, status: occ.assignedStudents > 0 ? 'occupied' : 'available' } as any)

    await OccupancyRecord.create({
      roomId: room.id,
      buildingId,
      recordDate,
      timeSlot,
      studentCount: occ.assignedStudents,
      occupancyRate: occ.utilizationRate,
    } as any)
  }

  metricsService.calculateBuildingMetrics(buildingId).catch((error) => {
    logger.error('Failed to update building metrics', { error })
  })

  return res.json({ success: true, data: { runId: run.id, ...output } })
})

export const energy = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' })

  const { buildingId, roomOccupancyData } = req.body as {
    buildingId?: string
    roomOccupancyData?: Array<{ roomId: string; studentCount: number; equipmentLoad: number }>
  }

  if (!buildingId || !Array.isArray(roomOccupancyData)) {
    return res.status(400).json({ success: false, error: 'buildingId and roomOccupancyData are required' })
  }

  const building = await Building.findByPk(buildingId)
  if (!building) return res.status(400).json({ success: false, error: 'Invalid buildingId' })

  const perStudentEnergyFactor = Number(process.env.BASE_ENERGY_PER_STUDENT) || 0.15

  const output = runEnergySimulation({
    buildingId,
    baseEnergyLoad: Number(building.baseEnergyLoad ?? 0),
    perStudentEnergyFactor,
    rooms: roomOccupancyData.map((r) => ({ id: r.roomId, studentCount: Number(r.studentCount), equipmentLoad: Number(r.equipmentLoad) })),
  })

  const run = await SimulationRun.create({
    buildingId,
    simulationType: 'energy',
    inputParameters: { buildingId, roomOccupancyData },
    outputResults: output,
    totalEnergyConsumption: output.totalEnergyConsumption,
    createdBy: req.user.id,
  } as any)

  auditService
    .logSimulation(req.user.id, run.id, 'energy', building.buildingName, req.ip, req.get('user-agent') ?? undefined)
    .catch((error) => {
      logger.error('Failed to write audit log', { error })
    })

  metricsService.calculateBuildingMetrics(buildingId).catch((error) => {
    logger.error('Failed to update building metrics', { error })
  })

  return res.json({ success: true, data: { runId: run.id, ...output } })
})

export const stress = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' })

  const { buildingId, maxCapacityScenario } = req.body as { buildingId?: string; maxCapacityScenario?: number }
  if (!buildingId) return res.status(400).json({ success: false, error: 'buildingId is required' })

  const building = await Building.findByPk(buildingId)
  if (!building) return res.status(400).json({ success: false, error: 'Invalid buildingId' })

  const rooms = await Room.findAll({ where: { buildingId } })
  const maxCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0)
  const scenario = maxCapacityScenario !== undefined ? Number(maxCapacityScenario) : maxCapacity

  const output = runStressTest({
    buildingId,
    maxCapacityScenario: scenario,
    rooms: rooms.map((r) => ({ id: r.id, capacity: r.capacity })),
  })

  const run = await SimulationRun.create({
    buildingId,
    simulationType: 'stress_test',
    inputParameters: { buildingId, maxCapacityScenario: scenario },
    outputResults: output,
    stressLevel: output.infrastructureStressScore > 85 ? 'high' : output.infrastructureStressScore > 60 ? 'medium' : 'low',
    createdBy: req.user.id,
  } as any)

  auditService
    .logSimulation(req.user.id, run.id, 'stress_test', building.buildingName, req.ip, req.get('user-agent') ?? undefined)
    .catch((error) => {
      logger.error('Failed to write audit log', { error })
    })

  metricsService.calculateBuildingMetrics(buildingId).catch((error) => {
    logger.error('Failed to update building metrics', { error })
  })

  return res.json({ success: true, data: { runId: run.id, ...output } })
})

export const history = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page ?? 1))
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 10)))
  const buildingId = String(req.query.buildingId ?? '').trim()
  const type = String(req.query.type ?? '').trim()

  const where: Record<string, unknown> = {}
  if (buildingId) where.buildingId = buildingId
  if (type) where.simulationType = type

  const offset = (page - 1) * limit
  const { rows, count } = await SimulationRun.findAndCountAll({
    where,
    limit,
    offset,
    order: [['createdAt', 'DESC']],
    include: [
      { model: Building, as: 'building', attributes: ['id', 'buildingName', 'buildingCode'] },
      { model: User, as: 'creator', attributes: ['id', 'name', 'email', 'role'] },
    ],
  })

  const totalPages = Math.max(1, Math.ceil(count / limit))

  return res.json({
    success: true,
    data: rows,
    total: count,
    page,
    totalPages,
    limit,
  })
})

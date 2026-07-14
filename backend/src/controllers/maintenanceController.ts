import type { Request, Response } from 'express'
import { Op } from 'sequelize'
import Building from '../models/Building'
import MaintenanceRecord from '../models/MaintenanceRecord'
import Room from '../models/Room'
import User from '../models/User'
import { asyncHandler } from '../utils/asyncHandler'

export const getAllMaintenance = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page ?? 1))
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 10)))
  const buildingId = String(req.query.buildingId ?? '').trim()
  const roomId = String(req.query.roomId ?? '').trim()
  const status = String(req.query.status ?? '').trim()
  const priority = String(req.query.priority ?? '').trim()
  const search = String(req.query.search ?? '').trim()

  const where: Record<string, unknown> = {}
  if (buildingId) where.buildingId = buildingId
  if (roomId) where.roomId = roomId
  if (status) where.status = status
  if (priority) where.priority = priority
  if (search) {
    where.issueDescription = { [Op.like]: `%${search}%` }
  }

  const offset = (page - 1) * limit

  const { rows, count } = await MaintenanceRecord.findAndCountAll({
    where,
    limit,
    offset,
    order: [['maintenanceDate', 'DESC']],
    include: [
      { model: Room, as: 'room' },
      { model: Building, as: 'building' },
      { model: User, as: 'creator' },
    ],
  })

  const data = rows.map((m) => {
    const json = m.toJSON() as any
    return {
      ...json,
      targetName: json.room?.roomNumber ?? json.building?.buildingName ?? 'Unknown',
      createdByName: json.creator?.name,
    }
  })

  return res.json({
    success: true,
    data,
    meta: {
      page,
      limit,
      total: count,
      totalPages: Math.max(1, Math.ceil(count / limit)),
    },
  })
})

export const getMaintenanceById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const record = await MaintenanceRecord.findByPk(id)
  if (!record) return res.status(404).json({ success: false, error: 'Maintenance record not found' })
  return res.json({ success: true, data: record })
})

export const createMaintenance = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' })

  const { roomId, buildingId, maintenanceDate, issueDescription, resolution, priority, status, cost } = req.body as Record<string, unknown>

  if (!maintenanceDate || !issueDescription || !priority) {
    return res.status(400).json({ success: false, error: 'maintenanceDate, issueDescription, priority are required' })
  }

  if (roomId) {
    const room = await Room.findByPk(String(roomId))
    if (!room) return res.status(400).json({ success: false, error: 'Invalid roomId' })
  }
  if (buildingId) {
    const building = await Building.findByPk(String(buildingId))
    if (!building) return res.status(400).json({ success: false, error: 'Invalid buildingId' })
  }

  const created = await MaintenanceRecord.create({
    roomId: roomId ? String(roomId) : null,
    buildingId: buildingId ? String(buildingId) : null,
    maintenanceDate: String(maintenanceDate),
    issueDescription: String(issueDescription),
    resolution: resolution ? String(resolution) : null,
    priority: String(priority),
    status: status ? String(status) : 'pending',
    cost: cost !== undefined ? Number(cost) : null,
    createdBy: req.user.id,
  } as any)

  return res.status(201).json({ success: true, data: created })
})

export const updateMaintenance = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const record = await MaintenanceRecord.findByPk(id)
  if (!record) return res.status(404).json({ success: false, error: 'Maintenance record not found' })

  const patch = req.body as Record<string, unknown>
  await record.update({
    ...patch,
    cost: patch.cost !== undefined ? Number(patch.cost) : record.cost,
  } as any)

  return res.json({ success: true, data: record })
})

export const deleteMaintenance = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const record = await MaintenanceRecord.findByPk(id)
  if (!record) return res.status(404).json({ success: false, error: 'Maintenance record not found' })
  await record.destroy()
  return res.json({ success: true, message: 'Maintenance record deleted' })
})

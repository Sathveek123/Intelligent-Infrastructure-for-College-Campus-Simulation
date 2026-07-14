import type { Request, Response } from 'express'
import { Op } from 'sequelize'
import Building from '../models/Building'
import Room from '../models/Room'
import { asyncHandler } from '../utils/asyncHandler'

export const getAllRooms = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page ?? 1))
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 10)))
  const search = String(req.query.search ?? '').trim()
  const buildingId = String(req.query.buildingId ?? '').trim()
  const status = String(req.query.status ?? '').trim()
  const roomType = String(req.query.roomType ?? '').trim()

  const where: Record<string, unknown> = {}
  if (buildingId) where.buildingId = buildingId
  if (status) where.status = status
  if (roomType) where.roomType = roomType
  if (search) where.roomNumber = { [Op.like]: `%${search}%` }

  const offset = (page - 1) * limit

  const { rows, count } = await Room.findAndCountAll({
    where,
    limit,
    offset,
    order: [['createdAt', 'DESC']],
    include: [{ model: Building, as: 'building' }],
  })

  const data = rows.map((r) => {
    const json = r.toJSON() as any
    return {
      ...json,
      buildingName: json.building?.buildingName,
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

export const getRoomById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const room = await Room.findByPk(id, { include: [{ model: Building, as: 'building' }] })
  if (!room) return res.status(404).json({ success: false, error: 'Room not found' })
  return res.json({ success: true, data: room })
})

export const createRoom = asyncHandler(async (req: Request, res: Response) => {
  const { buildingId, roomNumber, floor, capacity, roomType, equipmentList, status, currentOccupancy } = req.body as Record<
    string,
    unknown
  >

  if (!buildingId || !roomNumber || floor === undefined || capacity === undefined || !roomType) {
    return res.status(400).json({ success: false, error: 'Missing required fields' })
  }

  const building = await Building.findByPk(String(buildingId))
  if (!building) return res.status(400).json({ success: false, error: 'Invalid buildingId' })

  const exists = await Room.findOne({ where: { buildingId, roomNumber } })
  if (exists) return res.status(409).json({ success: false, error: 'Room number must be unique within a building' })

  const created = await Room.create({
    buildingId,
    roomNumber,
    floor: Number(floor),
    capacity: Number(capacity),
    roomType,
    equipmentList: equipmentList ? String(equipmentList) : null,
    status: status ? String(status) : 'available',
    currentOccupancy: currentOccupancy !== undefined ? Number(currentOccupancy) : 0,
  } as any)

  return res.status(201).json({ success: true, data: created })
})

export const updateRoom = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const room = await Room.findByPk(id)
  if (!room) return res.status(404).json({ success: false, error: 'Room not found' })

  const patch = req.body as Record<string, unknown>

  if (patch.buildingId && patch.buildingId !== room.buildingId) {
    const building = await Building.findByPk(String(patch.buildingId))
    if (!building) return res.status(400).json({ success: false, error: 'Invalid buildingId' })
  }

  if (patch.roomNumber || patch.buildingId) {
    const nextBuildingId = String(patch.buildingId ?? room.buildingId)
    const nextRoomNumber = String(patch.roomNumber ?? room.roomNumber)
    const exists = await Room.findOne({ where: { buildingId: nextBuildingId, roomNumber: nextRoomNumber } })
    if (exists && exists.id !== room.id) {
      return res.status(409).json({ success: false, error: 'Room number must be unique within a building' })
    }
  }

  await room.update({
    ...patch,
    floor: patch.floor !== undefined ? Number(patch.floor) : room.floor,
    capacity: patch.capacity !== undefined ? Number(patch.capacity) : room.capacity,
    currentOccupancy: patch.currentOccupancy !== undefined ? Number(patch.currentOccupancy) : room.currentOccupancy,
  } as any)

  return res.json({ success: true, data: room })
})

export const deleteRoom = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const room = await Room.findByPk(id)
  if (!room) return res.status(404).json({ success: false, error: 'Room not found' })
  await room.destroy()
  return res.json({ success: true, message: 'Room deleted' })
})

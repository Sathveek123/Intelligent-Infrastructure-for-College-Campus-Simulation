import type { Request, Response } from 'express'
import { Op } from 'sequelize'
import Building from '../models/Building'
import Room from '../models/Room'
import { asyncHandler } from '../utils/asyncHandler'

export const getAllBuildings = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page ?? 1))
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 10)))
  const search = String(req.query.search ?? '').trim()
  const buildingType = String(req.query.buildingType ?? '').trim()

  const where: Record<string, unknown> = {}
  if (search) {
    where[Op.or as any] = [
      { buildingName: { [Op.like]: `%${search}%` } },
      { buildingCode: { [Op.like]: `%${search}%` } },
    ]
  }
  if (buildingType) where.buildingType = buildingType

  const offset = (page - 1) * limit

  const { rows, count } = await Building.findAndCountAll({
    where,
    limit,
    offset,
    order: [['createdAt', 'DESC']],
  })

  return res.json({
    success: true,
    data: rows,
    meta: {
      page,
      limit,
      total: count,
      totalPages: Math.max(1, Math.ceil(count / limit)),
    },
  })
})

export const getBuildingById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  const building = await Building.findByPk(id, {
    include: [{ model: Room, as: 'rooms' }],
  })

  if (!building) return res.status(404).json({ success: false, error: 'Building not found' })

  const rooms = (building as any).rooms as Room[] | undefined
  const totalCapacity = (rooms ?? []).reduce((sum, r) => sum + r.capacity, 0)
  const currentOccupancy = (rooms ?? []).reduce((sum, r) => sum + (r.currentOccupancy ?? 0), 0)
  const occupancyRate = totalCapacity > 0 ? (currentOccupancy / totalCapacity) * 100 : 0

  return res.json({
    success: true,
    data: {
      ...building.toJSON(),
      stats: {
        totalCapacity,
        currentOccupancy,
        occupancyRate,
      },
    },
  })
})

export const createBuilding = asyncHandler(async (req: Request, res: Response) => {
  const { buildingName, buildingCode, totalFloors, totalRooms, constructionYear, buildingType, baseEnergyLoad } = req.body as Record<
    string,
    unknown
  >

  if (!buildingName || !buildingCode || !totalFloors || !totalRooms || !constructionYear || !buildingType) {
    return res.status(400).json({ success: false, error: 'Missing required fields' })
  }

  const exists = await Building.findOne({ where: { buildingCode } })
  if (exists) return res.status(409).json({ success: false, error: 'buildingCode must be unique' })

  const created = await Building.create({
    buildingName,
    buildingCode,
    totalFloors: Number(totalFloors),
    totalRooms: Number(totalRooms),
    constructionYear: Number(constructionYear),
    buildingType,
    baseEnergyLoad: baseEnergyLoad ? Number(baseEnergyLoad) : 0,
  } as any)

  return res.status(201).json({ success: true, data: created })
})

export const updateBuilding = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const building = await Building.findByPk(id)
  if (!building) return res.status(404).json({ success: false, error: 'Building not found' })

  const patch = req.body as Record<string, unknown>
  if (patch.buildingCode && patch.buildingCode !== building.buildingCode) {
    const exists = await Building.findOne({ where: { buildingCode: patch.buildingCode } })
    if (exists) return res.status(409).json({ success: false, error: 'buildingCode must be unique' })
  }

  await building.update({
    ...patch,
    totalFloors: patch.totalFloors !== undefined ? Number(patch.totalFloors) : building.totalFloors,
    totalRooms: patch.totalRooms !== undefined ? Number(patch.totalRooms) : building.totalRooms,
    constructionYear: patch.constructionYear !== undefined ? Number(patch.constructionYear) : building.constructionYear,
    baseEnergyLoad: patch.baseEnergyLoad !== undefined ? Number(patch.baseEnergyLoad) : building.baseEnergyLoad,
  } as any)

  return res.json({ success: true, data: building })
})

export const deleteBuilding = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const building = await Building.findByPk(id)
  if (!building) return res.status(404).json({ success: false, error: 'Building not found' })

  const roomsCount = await Room.count({ where: { buildingId: id } })
  if (roomsCount > 0) {
    return res.status(400).json({ success: false, error: 'Cannot delete building with rooms' })
  }

  await building.destroy()
  return res.json({ success: true, message: 'Building deleted' })
})

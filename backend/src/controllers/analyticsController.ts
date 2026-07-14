import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import {
  getBuildingComparison,
  getDashboardSummary,
  getEnergyTrend,
  getMaintenanceTrend,
  getOccupancyTrend,
  getUtilizationHeatmap,
} from '../services/analyticsEngine'

function parseDateRange(req: Request) {
  const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : null
  const endDate = req.query.endDate ? new Date(String(req.query.endDate)) : null
  if (startDate && endDate && !Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime())) {
    return { start: startDate, end: endDate }
  }
  return undefined
}

export const dashboard = asyncHandler(async (_req: Request, res: Response) => {
  const data = await getDashboardSummary()
  return res.json({ success: true, data })
})

export const occupancyTrend = asyncHandler(async (req: Request, res: Response) => {
  const buildingId = req.query.buildingId ? String(req.query.buildingId) : undefined
  const range = parseDateRange(req)
  const data = await getOccupancyTrend(buildingId, range)
  return res.json({ success: true, data })
})

export const energyTrend = asyncHandler(async (req: Request, res: Response) => {
  const buildingId = req.query.buildingId ? String(req.query.buildingId) : undefined
  const range = parseDateRange(req)
  const data = await getEnergyTrend(buildingId, range)
  return res.json({ success: true, data })
})

export const heatmap = asyncHandler(async (_req: Request, res: Response) => {
  const data = await getUtilizationHeatmap()
  return res.json({ success: true, data })
})

export const buildingComparison = asyncHandler(async (_req: Request, res: Response) => {
  const data = await getBuildingComparison()
  return res.json({ success: true, data })
})

export const maintenanceTrend = asyncHandler(async (req: Request, res: Response) => {
  const range = parseDateRange(req)
  const data = await getMaintenanceTrend(range)
  return res.json({ success: true, data })
})

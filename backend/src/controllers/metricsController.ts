import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { metricsService } from '../services/metricsService'
import { logger } from '../utils/logger'

export const getAllBuildingMetrics = asyncHandler(async (_req: Request, res: Response) => {
  const metrics = await metricsService.getAllBuildingMetrics()
  return res.json({ success: true, data: metrics })
})

export const getBuildingMetrics = asyncHandler(async (req: Request, res: Response) => {
  const { buildingId } = req.params
  const metrics = await metricsService.getBuildingMetrics(buildingId)

  if (!metrics) {
    return res.status(404).json({ success: false, error: 'Metrics not found for this building' })
  }

  return res.json({ success: true, data: metrics })
})

export const recalculateBuildingMetrics = asyncHandler(async (req: Request, res: Response) => {
  const { buildingId } = req.params
  const data = await metricsService.calculateBuildingMetrics(buildingId)
  return res.json({ success: true, message: 'Metrics recalculated successfully', data })
})

export const recalculateAllMetrics = asyncHandler(async (_req: Request, res: Response) => {
  metricsService.calculateAllBuildingsMetrics().catch((error) => {
    logger.error('Background metrics calculation failed', { error })
  })

  return res.json({ success: true, message: 'Metrics recalculation started in background' })
})

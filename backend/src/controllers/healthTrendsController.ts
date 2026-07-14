import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { healthSnapshotService } from '../services/healthSnapshotService'

export const getHealthTrend = asyncHandler(async (req: Request, res: Response) => {
  const { buildingId } = req.params
  const days = req.query.days ? Math.max(1, Number(req.query.days)) : 7

  const data = await healthSnapshotService.getHealthTrendResponse(buildingId, days)
  return res.json({ success: true, data })
})

export const getHealthOverview = asyncHandler(async (req: Request, res: Response) => {
  const days = req.query.days ? Math.max(1, Number(req.query.days)) : 7
  const data = await healthSnapshotService.getHealthOverview(days)
  return res.json({ success: true, data })
})

export const getCorrelation = asyncHandler(async (req: Request, res: Response) => {
  const { buildingId } = req.params
  const days = req.query.days ? Math.max(1, Number(req.query.days)) : 30
  const data = await healthSnapshotService.correlation(buildingId, days)
  return res.json({ success: true, data })
})

export const createManualSnapshot = asyncHandler(async (req: Request, res: Response) => {
  const { buildingId } = req.params
  await healthSnapshotService.createSnapshot(buildingId, 'manual')
  return res.json({ success: true, message: 'Snapshot created' })
})

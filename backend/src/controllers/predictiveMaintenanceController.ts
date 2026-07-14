import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { predictiveMaintenanceService } from '../services/predictiveMaintenanceService'
import { logger } from '../utils/logger'

export const runPredictiveAnalysis = asyncHandler(async (_req: Request, res: Response) => {
  predictiveMaintenanceService.runPredictiveAnalysis().catch((error) => {
    logger.error('Background predictive analysis failed', { error })
  })

  return res.json({ success: true, message: 'Predictive analysis started in background' })
})

export const getActivePredictions = asyncHandler(async (_req: Request, res: Response) => {
  const predictions = await predictiveMaintenanceService.getActivePredictions()
  return res.json({ success: true, data: predictions })
})

export const convertPredictionToScheduled = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' })

  const { maintenanceId } = req.params
  const { actualDate, actualCost } = req.body as { actualDate?: string; actualCost?: number }

  if (!actualDate) return res.status(400).json({ success: false, error: 'actualDate is required' })

  await predictiveMaintenanceService.convertToScheduled(
    maintenanceId,
    req.user.id,
    new Date(actualDate),
    typeof actualCost === 'number' ? actualCost : undefined,
  )

  return res.json({ success: true, message: 'Prediction converted to scheduled maintenance' })
})

export const dismissPrediction = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' })

  const { maintenanceId } = req.params
  const { reason } = req.body as { reason?: string }

  if (!reason || !reason.trim()) return res.status(400).json({ success: false, error: 'reason is required' })

  await predictiveMaintenanceService.dismissPrediction(maintenanceId, req.user.id, reason)

  return res.json({ success: true, message: 'Prediction dismissed' })
})

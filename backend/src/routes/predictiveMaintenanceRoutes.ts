import express from 'express'
import { authenticate } from '../middleware/auth'
import { requireAdmin, requireStaff } from '../middleware/roleCheck'
import {
  convertPredictionToScheduled,
  dismissPrediction,
  getActivePredictions,
  runPredictiveAnalysis,
} from '../controllers/predictiveMaintenanceController'

const router = express.Router()

router.get('/predictions', authenticate, requireStaff, getActivePredictions)
router.post('/analyze', authenticate, requireAdmin, runPredictiveAnalysis)
router.post('/predictions/:maintenanceId/convert', authenticate, requireAdmin, convertPredictionToScheduled)
router.post('/predictions/:maintenanceId/dismiss', authenticate, requireAdmin, dismissPrediction)

export default router

import express from 'express'
import { authenticate } from '../middleware/auth'
import { requireAdmin, requireStaff } from '../middleware/roleCheck'
import { getAllBuildingMetrics, getBuildingMetrics, recalculateAllMetrics, recalculateBuildingMetrics } from '../controllers/metricsController'

const router = express.Router()

router.get('/buildings', authenticate, requireStaff, getAllBuildingMetrics)
router.get('/buildings/:buildingId', authenticate, requireStaff, getBuildingMetrics)
router.post('/buildings/:buildingId/recalculate', authenticate, requireAdmin, recalculateBuildingMetrics)
router.post('/recalculate-all', authenticate, requireAdmin, recalculateAllMetrics)

export default router

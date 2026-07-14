import express from 'express'
import { authenticate } from '../middleware/auth'
import { requireAdmin, requireStaff } from '../middleware/roleCheck'
import { buildingComparison, dashboard, energyTrend, heatmap, maintenanceTrend, occupancyTrend } from '../controllers/analyticsController'
import { createManualSnapshot, getCorrelation, getHealthOverview, getHealthTrend } from '../controllers/healthTrendsController'
import { validateQuery } from '../middleware/validate'
import { analyticsQuerySchema } from '../utils/validators'

const router = express.Router()

router.get('/dashboard', authenticate, requireStaff, dashboard)
router.get('/occupancy-trend', authenticate, requireStaff, validateQuery(analyticsQuerySchema), occupancyTrend)
router.get('/energy-trend', authenticate, requireStaff, validateQuery(analyticsQuerySchema), energyTrend)
router.get('/maintenance-trend', authenticate, requireStaff, validateQuery(analyticsQuerySchema), maintenanceTrend)
router.get('/heatmap', authenticate, requireStaff, heatmap)
router.get('/building-comparison', authenticate, requireStaff, buildingComparison)

router.get('/health-trends/:buildingId', authenticate, requireStaff, getHealthTrend)
router.get('/health-overview', authenticate, requireStaff, getHealthOverview)
router.get('/correlation/:buildingId', authenticate, requireStaff, getCorrelation)
router.post('/snapshots/:buildingId', authenticate, requireAdmin, createManualSnapshot)

export default router

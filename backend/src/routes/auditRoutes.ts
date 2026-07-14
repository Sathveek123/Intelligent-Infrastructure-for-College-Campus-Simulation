import express from 'express'
import { authenticate } from '../middleware/auth'
import { requireAdmin } from '../middleware/roleCheck'
import { exportAuditLogs, getAuditLogs, getEntityHistory, getSecurityEvents, getUserActivity } from '../controllers/auditController'

const router = express.Router()

router.get('/logs', authenticate, requireAdmin, getAuditLogs)
router.get('/users/:userId/activity', authenticate, requireAdmin, getUserActivity)
router.get('/entities/:entity/:entityId/history', authenticate, requireAdmin, getEntityHistory)
router.get('/security-events', authenticate, requireAdmin, getSecurityEvents)
router.get('/export', authenticate, requireAdmin, exportAuditLogs)

export default router

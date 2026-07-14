import express from 'express'
import { createMaintenance, deleteMaintenance, getAllMaintenance, getMaintenanceById, updateMaintenance } from '../controllers/maintenanceController'
import { authenticate } from '../middleware/auth'
import { auditCRUD } from '../middleware/auditMiddleware'
import { validate } from '../middleware/validate'
import { createMaintenanceSchema, updateMaintenanceSchema } from '../utils/validators'

const router = express.Router()

router.get('/', authenticate, getAllMaintenance)
router.get('/:id', authenticate, getMaintenanceById)
router.post('/', authenticate, auditCRUD('maintenance'), validate(createMaintenanceSchema), createMaintenance)
router.put('/:id', authenticate, auditCRUD('maintenance'), validate(updateMaintenanceSchema), updateMaintenance)
router.delete('/:id', authenticate, auditCRUD('maintenance'), deleteMaintenance)

export default router

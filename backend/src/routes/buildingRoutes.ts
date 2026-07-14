import express from 'express'
import { createBuilding, deleteBuilding, getAllBuildings, getBuildingById, updateBuilding } from '../controllers/buildingController'
import { authenticate } from '../middleware/auth'
import { requireAdmin } from '../middleware/roleCheck'
import { auditCRUD } from '../middleware/auditMiddleware'
import { validate } from '../middleware/validate'
import { createBuildingSchema, updateBuildingSchema } from '../utils/validators'

const router = express.Router()

router.get('/', authenticate, getAllBuildings)
router.get('/:id', authenticate, getBuildingById)
router.post('/', authenticate, requireAdmin, auditCRUD('building'), validate(createBuildingSchema), createBuilding)
router.put('/:id', authenticate, requireAdmin, auditCRUD('building'), validate(updateBuildingSchema), updateBuilding)
router.delete('/:id', authenticate, requireAdmin, auditCRUD('building'), deleteBuilding)

export default router

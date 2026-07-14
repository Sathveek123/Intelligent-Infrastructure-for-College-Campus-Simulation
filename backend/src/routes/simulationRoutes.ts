import express from 'express'
import { energy, history, occupancy, stress } from '../controllers/simulationController'
import { authenticate } from '../middleware/auth'
import { requireStaff } from '../middleware/roleCheck'
import { validate, validateQuery } from '../middleware/validate'
import { energySimulationSchema, occupancySimulationSchema, paginationQuerySchema, stressTestSchema } from '../utils/validators'

const router = express.Router()

router.post('/occupancy', authenticate, requireStaff, validate(occupancySimulationSchema), occupancy)
router.post('/energy', authenticate, requireStaff, validate(energySimulationSchema), energy)
router.post('/stress-test', authenticate, requireStaff, validate(stressTestSchema), stress)
router.get('/history', authenticate, requireStaff, validateQuery(paginationQuerySchema), history)

export default router

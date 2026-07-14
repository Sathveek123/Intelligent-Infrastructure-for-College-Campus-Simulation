import express from 'express'
import { createUser, deleteUser, getAllUsers, updateUser } from '../controllers/userController'
import { authenticate } from '../middleware/auth'
import { requireAdmin } from '../middleware/roleCheck'
import { auditCRUD } from '../middleware/auditMiddleware'
import { validate } from '../middleware/validate'
import { createUserSchema, updateUserSchema } from '../utils/validators'

const router = express.Router()

router.get('/', authenticate, requireAdmin, getAllUsers)
router.post('/', authenticate, requireAdmin, auditCRUD('user'), validate(createUserSchema), createUser)
router.put('/:id', authenticate, requireAdmin, auditCRUD('user'), validate(updateUserSchema), updateUser)
router.delete('/:id', authenticate, requireAdmin, auditCRUD('user'), deleteUser)

export default router

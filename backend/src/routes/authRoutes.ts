import express from 'express'
import { login, me, refresh, register } from '../controllers/authController'
import { authenticate } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { loginSchema, refreshSchema, registerSchema } from '../utils/validators'

const router = express.Router()

router.post('/register', validate(registerSchema), register)
router.post('/login', validate(loginSchema), login)
router.post('/refresh', validate(refreshSchema), refresh)
router.get('/me', authenticate, me)

export default router

import express from 'express'
import { createRoom, deleteRoom, getAllRooms, getRoomById, updateRoom } from '../controllers/roomController'
import { authenticate } from '../middleware/auth'
import { requireAdmin } from '../middleware/roleCheck'
import { auditCRUD } from '../middleware/auditMiddleware'
import { validate } from '../middleware/validate'
import { createRoomSchema, updateRoomSchema } from '../utils/validators'

const router = express.Router()

router.get('/', authenticate, getAllRooms)
router.get('/:id', authenticate, getRoomById)
router.post('/', authenticate, requireAdmin, auditCRUD('room'), validate(createRoomSchema), createRoom)
router.put('/:id', authenticate, requireAdmin, auditCRUD('room'), validate(updateRoomSchema), updateRoom)
router.delete('/:id', authenticate, requireAdmin, auditCRUD('room'), deleteRoom)

export default router

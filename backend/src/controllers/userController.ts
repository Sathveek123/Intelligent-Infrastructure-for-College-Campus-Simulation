import type { Request, Response } from 'express'
import { Op } from 'sequelize'
import User from '../models/User'
import { asyncHandler } from '../utils/asyncHandler'

function toSafeUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page ?? 1))
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 10)))
  const search = String(req.query.search ?? '').trim()

  const where: Record<string, unknown> = {}
  if (search) {
    where[Op.or as any] = [{ name: { [Op.like]: `%${search}%` } }, { email: { [Op.like]: `%${search}%` } }]
  }

  const offset = (page - 1) * limit
  const { rows, count } = await User.findAndCountAll({ where, limit, offset, order: [['createdAt', 'DESC']] })

  return res.json({
    success: true,
    data: rows.map(toSafeUser),
    meta: {
      page,
      limit,
      total: count,
      totalPages: Math.max(1, Math.ceil(count / limit)),
    },
  })
})

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role, isActive } = req.body as {
    name?: string
    email?: string
    password?: string
    role?: 'admin' | 'staff'
    isActive?: boolean
  }

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, error: 'name, email, password are required' })
  }

  const exists = await User.findOne({ where: { email } })
  if (exists) return res.status(409).json({ success: false, error: 'Email already exists' })

  const passwordHash = await User.hashPassword(password)
  const created = await User.create({ name, email, passwordHash, role: role ?? 'staff', isActive: isActive ?? true })

  return res.status(201).json({ success: true, data: toSafeUser(created) })
})

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const user = await User.findByPk(id)
  if (!user) return res.status(404).json({ success: false, error: 'User not found' })

  const { name, email, role, isActive, password } = req.body as {
    name?: string
    email?: string
    role?: 'admin' | 'staff'
    isActive?: boolean
    password?: string
  }

  if (email && email !== user.email) {
    const exists = await User.findOne({ where: { email } })
    if (exists) return res.status(409).json({ success: false, error: 'Email already exists' })
  }

  const patch: Record<string, unknown> = {}
  if (name !== undefined) patch.name = name
  if (email !== undefined) patch.email = email
  if (role !== undefined) patch.role = role
  if (isActive !== undefined) patch.isActive = isActive
  if (password) patch.passwordHash = await User.hashPassword(password)

  await user.update(patch)
  return res.json({ success: true, data: toSafeUser(user) })
})

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const user = await User.findByPk(id)
  if (!user) return res.status(404).json({ success: false, error: 'User not found' })

  await user.destroy()
  return res.json({ success: true, message: 'User deleted' })
})

import type { Request, Response } from 'express'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { jwtConfig } from '../config/jwt'
import RefreshToken from '../models/RefreshToken'
import User from '../models/User'
import { auditService } from '../services/auditService'
import { logger } from '../utils/logger'
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

function signToken(user: User) {
  return jwt.sign({ userId: user.id, role: user.role }, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn })
}

async function issueRefreshToken(userId: string) {
  const token = crypto.randomBytes(64).toString('hex')
  const expiresAt = new Date()
  const ttlDays = Number(process.env.REFRESH_TOKEN_DAYS) || 7
  expiresAt.setDate(expiresAt.getDate() + ttlDays)

  await RefreshToken.create({ userId, token, expiresAt } as any)
  return { token, expiresAt }
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body as {
    name?: string
    email?: string
    password?: string
    role?: 'admin' | 'staff'
  }

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, error: 'name, email, password are required' })
  }

  const exists = await User.findOne({ where: { email } })
  if (exists) {
    return res.status(409).json({ success: false, error: 'Email already exists' })
  }

  const passwordHash = await User.hashPassword(password)
  const user = await User.create({ name, email, passwordHash, role: role ?? 'staff', isActive: true })

  const token = signToken(user)
  const refresh = await issueRefreshToken(user.id)
  return res.status(201).json({ success: true, user: toSafeUser(user), token, refreshToken: refresh.token })
})

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string }
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'email and password are required' })
  }

  const user = await User.findOne({ where: { email } })
  if (!user || !user.isActive) {
    auditService.logLogin(null, false, req.ip, email).catch((error) => {
      logger.error('Failed to write audit log', { error })
    })
    return res.status(401).json({ success: false, error: 'Invalid credentials' })
  }

  const ok = await user.comparePassword(password)
  if (!ok) {
    auditService.logLogin(user.id, false, req.ip, user.email).catch((error) => {
      logger.error('Failed to write audit log', { error })
    })
    return res.status(401).json({ success: false, error: 'Invalid credentials' })
  }

  const token = signToken(user)
  const refresh = await issueRefreshToken(user.id)

  auditService.logLogin(user.id, true, req.ip, user.email).catch((error) => {
    logger.error('Failed to write audit log', { error })
  })

  return res.json({ success: true, user: toSafeUser(user), token, refreshToken: refresh.token })
})

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' })
  const user = await User.findByPk(req.user.id)
  if (!user) return res.status(404).json({ success: false, error: 'User not found' })
  return res.json({ success: true, user: toSafeUser(user) })
})

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body as { refreshToken?: string }
  if (!refreshToken) return res.status(400).json({ success: false, error: 'refreshToken is required' })

  const record = await RefreshToken.findOne({ where: { token: refreshToken }, include: [{ model: User, as: 'user' }] })
  if (!record) return res.status(401).json({ success: false, error: 'Invalid refresh token' })

  if (new Date() > record.expiresAt) {
    await record.destroy()
    return res.status(401).json({ success: false, error: 'Refresh token expired' })
  }

  const user = (record as any).user as User | undefined
  if (!user || !user.isActive) return res.status(401).json({ success: false, error: 'Invalid user' })

  const token = signToken(user)
  return res.json({ success: true, token })
})

import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { jwtConfig } from '../config/jwt'
import User from '../models/User'

type JwtPayload = {
  userId: string
  role: 'admin' | 'staff'
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Missing Authorization header' })
  }

  const token = header.slice('Bearer '.length).trim()

  try {
    const decoded = jwt.verify(token, jwtConfig.secret) as JwtPayload
    const user = await User.findByPk(decoded.userId)
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, error: 'Invalid user' })
    }

    req.user = { id: user.id, role: user.role }
    next()
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' })
  }
}

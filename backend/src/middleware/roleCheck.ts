import type { NextFunction, Request, Response } from 'express'

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' })
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Forbidden' })
  next()
}

export function requireStaff(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' })
  if (req.user.role !== 'admin' && req.user.role !== 'staff') return res.status(403).json({ success: false, error: 'Forbidden' })
  next()
}

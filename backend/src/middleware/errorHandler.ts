import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const anyErr = err as any

  // Zod validation
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    })
  }

  // Sequelize validation
  if (anyErr?.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: (anyErr.errors || []).map((e: any) => ({ field: e.path, message: e.message })),
    })
  }

  // Sequelize unique
  if (anyErr?.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry',
      errors: (anyErr.errors || []).map((e: any) => ({ field: e.path, message: `${e.path} already exists` })),
    })
  }

  // JWT
  if (anyErr?.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, error: 'Invalid token' })
  }
  if (anyErr?.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, error: 'Token expired' })
  }

  const statusCode = Number(anyErr?.statusCode || anyErr?.status || 500)
  const message = anyErr?.message || (err instanceof Error ? err.message : 'Internal server error')

  return res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && err instanceof Error ? { stack: err.stack } : {}),
  })
}

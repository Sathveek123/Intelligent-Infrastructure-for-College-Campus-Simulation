import type { NextFunction, Request, Response } from 'express'
import { auditService } from '../services/auditService'
import type { AuditAction, AuditEntity } from '../models/AuditLog'
import { logger } from '../utils/logger'

function getActionFromMethod(method: string): AuditAction {
  const methodMap: Record<string, AuditAction> = {
    POST: 'create',
    PUT: 'update',
    PATCH: 'update',
    DELETE: 'delete',
    GET: 'read',
  }
  return methodMap[method] ?? 'read'
}

function sanitizeBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body
  const sanitized: any = { ...(body as any) }
  const sensitive = ['password', 'passwordHash', 'token', 'refreshToken']
  for (const k of sensitive) {
    if (sanitized[k] !== undefined) sanitized[k] = '[REDACTED]'
  }
  return sanitized
}

export function auditCRUD(entity: AuditEntity) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
      if (res.statusCode >= 400) return

      const action = getActionFromMethod(req.method)
      const entityId = (req.params as any).id ?? (req.params as any).buildingId ?? (req.params as any).roomId

      auditService
        .log({
          actorId: req.user?.id,
          actorRole: (req.user?.role ?? 'staff') as any,
          action,
          entity,
          entityId: entityId ? String(entityId) : undefined,
          metadata: {
            method: req.method,
            path: req.path,
            body: sanitizeBody(req.body) as any,
            query: req.query as any,
          },
          result: 'success',
          ipAddress: req.ip,
          userAgent: req.get('user-agent') ?? undefined,
        })
        .catch((err) => logger.error('Audit log failed', { err }))
    })

    next()
  }
}

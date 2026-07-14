import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { auditService } from '../services/auditService'
import type { AuditAction, AuditEntity, AuditResult } from '../models/AuditLog'

export const getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const { actorId, action, entity, startDate, endDate, result, page = '1', limit = '50' } = req.query as Record<string, string>

  const data = await auditService.getLogs({
    actorId: actorId || undefined,
    action: (action as AuditAction) || undefined,
    entity: (entity as AuditEntity) || undefined,
    result: (result as AuditResult) || undefined,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    page: Number(page),
    limit: Number(limit),
  })

  return res.json({ success: true, data: data.data, pagination: data.pagination })
})

export const getUserActivity = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params
  const days = req.query.days ? Number(req.query.days) : 30
  const data = await auditService.getUserActivity(userId, days)
  return res.json({ success: true, data })
})

export const getEntityHistory = asyncHandler(async (req: Request, res: Response) => {
  const { entity, entityId } = req.params as { entity: AuditEntity; entityId: string }
  const data = await auditService.getEntityHistory(entity, entityId)
  return res.json({ success: true, data })
})

export const getSecurityEvents = asyncHandler(async (req: Request, res: Response) => {
  const days = req.query.days ? Number(req.query.days) : 7
  const data = await auditService.getSecurityEvents(days)
  return res.json({ success: true, data })
})

function escapeCsv(v: unknown): string {
  const s = String(v ?? '')
  if (s.includes(',') || s.includes('\n') || s.includes('"')) return `"${s.replace(/"/g, '""')}"`
  return s
}

export const exportAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query as Record<string, string>

  const logs = await auditService.getLogs({
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    limit: 10000,
  })

  const header = ['timestamp', 'actorEmail', 'actorRole', 'action', 'entity', 'entityId', 'entityName', 'result', 'ipAddress']
  const rows = logs.data.map((l) => [
    l.timestamp.toISOString(),
    l.actorEmail ?? '',
    l.actorRole,
    l.action,
    l.entity,
    l.entityId ?? '',
    l.entityName ?? '',
    l.result,
    l.ipAddress ?? '',
  ])

  const csv = [header.join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\n')

  // log export action (non-blocking)
  auditService.log({
    actorId: req.user?.id,
    actorRole: (req.user?.role ?? 'admin') as any,
    action: 'export_csv',
    entity: 'audit_log',
    metadata: { startDate, endDate, count: logs.data.length },
    result: 'success',
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? undefined,
  })

  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`)
  return res.send(csv)
})

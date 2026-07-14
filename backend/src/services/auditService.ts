import { Op } from 'sequelize'
import AuditLog, { type AuditAction, type AuditActorRole, type AuditEntity, type AuditResult } from '../models/AuditLog'
import User from '../models/User'
import { logger } from '../utils/logger'

type LogInput = {
  actorId?: string
  actorEmail?: string
  actorRole: AuditActorRole
  action: AuditAction
  entity: AuditEntity
  entityId?: string
  entityName?: string
  changes?: Record<string, unknown>
  metadata?: Record<string, unknown>
  result?: AuditResult
  errorMessage?: string
  ipAddress?: string
  userAgent?: string
}

type Paginated<T> = {
  data: T
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

function sanitize(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj
  const copy: any = Array.isArray(obj) ? [...(obj as any)] : { ...(obj as any) }
  const sensitive = ['password', 'passwordHash', 'token', 'refreshToken']
  for (const k of sensitive) {
    if (copy[k] !== undefined) copy[k] = '[REDACTED]'
  }
  return copy
}

export class AuditService {
  async log(input: LogInput): Promise<void> {
    try {
      let actorEmail = input.actorEmail ?? null
      let actorRole = input.actorRole

      if (input.actorId && (!actorEmail || actorRole === 'system')) {
        const user = await User.findByPk(input.actorId)
        if (user) {
          actorEmail = actorEmail ?? user.email
          actorRole = (user.role as AuditActorRole) ?? actorRole
        }
      }

      await AuditLog.create({
        actorId: input.actorId ?? null,
        actorEmail,
        actorRole,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        entityName: input.entityName ?? null,
        changes: input.changes ? (sanitize(input.changes) as any) : null,
        metadata: input.metadata ? (sanitize(input.metadata) as any) : null,
        result: input.result ?? 'success',
        errorMessage: input.errorMessage ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        timestamp: new Date(),
      } as any)
    } catch (error) {
      logger.error('Audit log failed', { error })
    }
  }

  async logLogin(actorId: string | null, success: boolean, ipAddress?: string, actorEmail?: string): Promise<void> {
    await this.log({
      actorId: actorId ?? undefined,
      actorEmail,
      actorRole: actorId ? 'staff' : 'system',
      action: success ? 'login' : 'failed_login',
      entity: 'user',
      entityId: actorId ?? undefined,
      result: success ? 'success' : 'failure',
      ipAddress,
    })
  }

  async logSimulation(actorId: string, simulationId: string, type: string, buildingName: string, ipAddress?: string, userAgent?: string) {
    await this.log({
      actorId,
      actorRole: 'staff',
      action: 'simulation_run',
      entity: 'simulation',
      entityId: simulationId,
      entityName: buildingName,
      metadata: { simulationType: type },
      ipAddress,
      userAgent,
    })
  }

  async logPrediction(buildingId: string, buildingName: string, confidence: number) {
    await this.log({
      actorRole: 'system',
      action: 'prediction_generated',
      entity: 'prediction',
      entityId: buildingId,
      entityName: buildingName,
      metadata: { confidence },
    })
  }

  async getLogs(filters: {
    actorId?: string
    action?: AuditAction
    entity?: AuditEntity
    startDate?: Date
    endDate?: Date
    result?: AuditResult
    page?: number
    limit?: number
  }): Promise<Paginated<AuditLog[]>> {
    const page = Math.max(1, Number(filters.page ?? 1))
    const limit = Math.min(200, Math.max(1, Number(filters.limit ?? 50)))
    const offset = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (filters.actorId) where.actorId = filters.actorId
    if (filters.action) where.action = filters.action
    if (filters.entity) where.entity = filters.entity
    if (filters.result) where.result = filters.result

    if (filters.startDate || filters.endDate) {
      where.timestamp = {
        ...(filters.startDate ? { [Op.gte]: filters.startDate } : {}),
        ...(filters.endDate ? { [Op.lte]: filters.endDate } : {}),
      }
    }

    const { rows, count } = await AuditLog.findAndCountAll({
      where,
      limit,
      offset,
      order: [['timestamp', 'DESC']],
    })

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.max(1, Math.ceil(count / limit)),
      },
    }
  }

  async getUserActivity(userId: string, days: number) {
    const start = new Date()
    start.setDate(start.getDate() - Math.max(1, days))

    const rows = await AuditLog.findAll({
      where: {
        actorId: userId,
        timestamp: { [Op.gte]: start },
      },
      order: [['timestamp', 'ASC']],
    })

    const byDate = new Map<string, Map<string, number>>()

    for (const r of rows) {
      const d = r.timestamp.toISOString().slice(0, 10)
      const action = r.action
      if (!byDate.has(d)) byDate.set(d, new Map())
      const m = byDate.get(d)!
      m.set(action, (m.get(action) ?? 0) + 1)
    }

    return Array.from(byDate.entries()).map(([date, actions]) => ({
      date,
      actionCount: Array.from(actions.values()).reduce((s, v) => s + v, 0),
      actions: Array.from(actions.entries()).map(([action, count]) => ({ action, count })),
    }))
  }

  async getEntityHistory(entity: AuditEntity, entityId: string) {
    const rows = await AuditLog.findAll({
      where: { entity, entityId },
      order: [['timestamp', 'ASC']],
    })

    return rows.map((r) => ({
      timestamp: r.timestamp.toISOString(),
      action: r.action,
      actor: r.actorEmail ?? r.actorId ?? 'system',
      changes: (r.changes ?? {}) as any,
    }))
  }

  async getSecurityEvents(days: number) {
    const start = new Date()
    start.setDate(start.getDate() - Math.max(1, days))

    const rows = await AuditLog.findAll({
      where: {
        timestamp: { [Op.gte]: start },
        action: { [Op.in]: ['failed_login'] },
      },
      order: [['timestamp', 'DESC']],
      limit: 200,
    })

    return rows.map((r) => ({
      timestamp: r.timestamp.toISOString(),
      type: 'failed_login' as const,
      actorEmail: r.actorEmail ?? 'unknown',
      ipAddress: r.ipAddress ?? 'unknown',
      details: r.errorMessage ?? 'Failed login attempt',
    }))
  }
}

export const auditService = new AuditService()

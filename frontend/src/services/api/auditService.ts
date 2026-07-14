import type { AuditLog, AuditLogAction, AuditLogEntity, AuditLogResult } from '@/types'

type LogsResponse = {
  data: AuditLog[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

const STORAGE_KEY = 'i2sf_audit_logs_v1'

function readLogs(): AuditLog[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as AuditLog[]
  } catch {
    return []
  }
}

function paginate<T>(items: T[], page = 1, limit = 50) {
  const safePage = Math.max(1, Math.floor(page))
  const safeLimit = Math.max(1, Math.floor(limit))
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / safeLimit))
  const clampedPage = Math.min(safePage, totalPages)
  const start = (clampedPage - 1) * safeLimit
  return { data: items.slice(start, start + safeLimit), pagination: { page: clampedPage, limit: safeLimit, total, totalPages } }
}

export async function fetchAuditLogs(params: {
  page?: number
  limit?: number
  actorId?: string
  action?: AuditLogAction
  entity?: AuditLogEntity
  result?: AuditLogResult
  startDate?: string
  endDate?: string
}) {
  const logs = readLogs()

  const filtered = logs.filter((l) => {
    if (params.actorId && l.actorId !== params.actorId) return false
    if (params.action && l.action !== params.action) return false
    if (params.entity && l.entity !== params.entity) return false
    if (params.result && l.result !== params.result) return false
    if (params.startDate && l.timestamp.slice(0, 10) < params.startDate) return false
    if (params.endDate && l.timestamp.slice(0, 10) > params.endDate) return false
    return true
  })

  const { data, pagination } = paginate(filtered, params.page ?? 1, params.limit ?? 50)
  return { data, pagination } as LogsResponse
}

function toCsvRow(values: Array<string | number>) {
  return values
    .map((v) => {
      const s = String(v ?? '')
      const escaped = s.replace(/"/g, '""')
      return `"${escaped}"`
    })
    .join(',')
}

export async function exportAuditLogsCsv(params: { startDate?: string; endDate?: string }) {
  const res = await fetchAuditLogs({ page: 1, limit: 100000, startDate: params.startDate, endDate: params.endDate })

  const header = toCsvRow(['timestamp', 'actorId', 'actorEmail', 'actorRole', 'action', 'entity', 'entityId', 'entityName', 'result', 'errorMessage'])
  const rows = res.data.map((l) =>
    toCsvRow([
      l.timestamp,
      l.actorId ?? '',
      l.actorEmail ?? '',
      l.actorRole,
      l.action,
      l.entity,
      l.entityId ?? '',
      l.entityName ?? '',
      l.result,
      l.errorMessage ?? '',
    ]),
  )

  return `${header}\n${rows.join('\n')}\n`
}

export function buildAuditExportUrl(params: { startDate?: string; endDate?: string }) {
  const qs = new URLSearchParams()
  if (params.startDate) qs.set('startDate', params.startDate)
  if (params.endDate) qs.set('endDate', params.endDate)
  const s = qs.toString()
  return `/audit/export${s ? `?${s}` : ''}`
}

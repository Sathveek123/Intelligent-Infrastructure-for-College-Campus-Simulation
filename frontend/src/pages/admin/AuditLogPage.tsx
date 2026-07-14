import { useEffect, useMemo, useState } from 'react'
import { Download, Filter, ShieldAlert } from 'lucide-react'
import Button from '@/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/Card'
import Input from '@/ui/Input'
import ErrorState from '@/ui/ErrorState'
import EmptyState from '@/ui/EmptyState'
import LoadingSkeleton from '@/ui/LoadingSkeleton'
import { useToast } from '@/ui/toast'
import type { AuditLog, AuditLogAction, AuditLogEntity, AuditLogResult } from '@/types'
import { exportAuditLogsCsv, fetchAuditLogs } from '@/services/api/auditService'

function formatDate(v: string) {
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return d.toLocaleString()
}

export default function AuditLogPage() {
  const { push } = useToast()
  const [items, setItems] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const [limit] = useState(25)
  const [pagination, setPagination] = useState<{ page: number; limit: number; total: number; totalPages: number } | null>(null)

  const [filtersOpen, setFiltersOpen] = useState(false)
  const [actorId, setActorId] = useState('')
  const [action, setAction] = useState<AuditLogAction | ''>('')
  const [entity, setEntity] = useState<AuditLogEntity | ''>('')
  const [result, setResult] = useState<AuditLogResult | ''>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const queryParams = useMemo(() => {
    return {
      page,
      limit,
      actorId: actorId.trim() || undefined,
      action: action || undefined,
      entity: entity || undefined,
      result: result || undefined,
      startDate: startDate.trim() || undefined,
      endDate: endDate.trim() || undefined,
    }
  }, [action, actorId, endDate, entity, limit, page, result, startDate])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchAuditLogs(queryParams)
      setItems(res.data)
      setPagination(res.pagination)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParams])

  async function downloadCsv() {
    try {
      const csv = await exportAuditLogsCsv({ startDate: startDate.trim() || undefined, endDate: endDate.trim() || undefined })
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      push({ tone: 'success', title: 'Downloaded CSV' })
    } catch (e) {
      push({ tone: 'error', title: 'Export failed', message: e instanceof Error ? e.message : 'Unknown error' })
    }
  }

  const totalPages = pagination?.totalPages ?? 1

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-white">Audit Logs</div>
          <div className="text-sm text-white/60">Security and activity trail (admin only)</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setFiltersOpen((v) => !v)}>
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Button onClick={downloadCsv}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {filtersOpen ? (
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <div className="mb-1 text-xs font-semibold text-white/60">Actor ID</div>
                <Input value={actorId} onChange={(e) => setActorId(e.target.value)} placeholder="user UUID" />
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold text-white/60">Action</div>
                <select
                  className="h-10 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/20"
                  value={action}
                  onChange={(e) => setAction(e.target.value as any)}
                >
                  <option value="">All</option>
                  {(
                    [
                      'login',
                      'logout',
                      'failed_login',
                      'create',
                      'update',
                      'delete',
                      'read',
                      'simulation_run',
                      'metrics_calculated',
                      'prediction_generated',
                      'prediction_converted',
                      'prediction_dismissed',
                      'export_csv',
                      'export_pdf',
                    ] as AuditLogAction[]
                  ).map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold text-white/60">Entity</div>
                <select
                  className="h-10 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/20"
                  value={entity}
                  onChange={(e) => setEntity(e.target.value as any)}
                >
                  <option value="">All</option>
                  {(['user', 'building', 'room', 'maintenance', 'simulation', 'metrics', 'prediction', 'audit_log'] as AuditLogEntity[]).map((en) => (
                    <option key={en} value={en}>
                      {en}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold text-white/60">Result</div>
                <select
                  className="h-10 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/20"
                  value={result}
                  onChange={(e) => setResult(e.target.value as any)}
                >
                  <option value="">All</option>
                  <option value="success">success</option>
                  <option value="failure">failure</option>
                </select>
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold text-white/60">Start date</div>
                <Input value={startDate} onChange={(e) => setStartDate(e.target.value)} placeholder="YYYY-MM-DD" />
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold text-white/60">End date</div>
                <Input value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="YYYY-MM-DD" />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setActorId('')
                  setAction('')
                  setEntity('')
                  setResult('')
                  setStartDate('')
                  setEndDate('')
                  setPage(1)
                }}
              >
                Clear
              </Button>
              <Button
                onClick={() => {
                  setPage(1)
                  void load()
                }}
              >
                Apply
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <LoadingSkeleton variant="table" count={6} />
      ) : error ? (
        <ErrorState title="Failed to load audit logs" message={error} />
      ) : items.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="No audit logs" description="No logs matched your filters." />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Logs</CardTitle>
              <div className="text-sm text-white/60">
                Total: {pagination?.total ?? items.length} • Page {pagination?.page ?? 1} / {pagination?.totalPages ?? 1}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs font-semibold text-white/60">
                    <th className="py-2 pr-4">Time</th>
                    <th className="py-2 pr-4">Actor</th>
                    <th className="py-2 pr-4">Role</th>
                    <th className="py-2 pr-4">Action</th>
                    <th className="py-2 pr-4">Entity</th>
                    <th className="py-2 pr-4">Entity ID</th>
                    <th className="py-2 pr-4">Result</th>
                    <th className="py-2 pr-4">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((l) => (
                    <tr key={l.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 pr-4 whitespace-nowrap text-white/80">{formatDate(l.timestamp)}</td>
                      <td className="py-2 pr-4 text-white/80">{l.actorEmail ?? l.actorId ?? 'system'}</td>
                      <td className="py-2 pr-4 text-white/80">{l.actorRole}</td>
                      <td className="py-2 pr-4 text-white/80">{l.action}</td>
                      <td className="py-2 pr-4 text-white/80">{l.entity}</td>
                      <td className="py-2 pr-4 max-w-[260px] truncate" title={l.entityId ?? ''}>
                        <span className="text-white/80">{l.entityId ?? '-'}</span>
                      </td>
                      <td className="py-2 pr-4 text-white/80">{l.result}</td>
                      <td className="py-2 pr-4 text-white/80">{l.ipAddress ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-white/60">Showing {items.length} rows</div>
              <div className="flex items-center gap-2">
                <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Prev
                </Button>
                <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

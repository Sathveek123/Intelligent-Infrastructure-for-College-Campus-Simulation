import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Plus, Search, Sparkles, Trash2, Wrench } from 'lucide-react'
import Badge from '@/ui/Badge'
import Button from '@/ui/Button'
import Input from '@/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/Card'
import ConfirmDialog from '@/ui/ConfirmDialog'
import EmptyState from '@/ui/EmptyState'
import ErrorState from '@/ui/ErrorState'
import LoadingSkeleton from '@/ui/LoadingSkeleton'
import Modal from '@/ui/Modal'
import { useToast } from '@/ui/toast'
import type { Building, MaintenanceRecord, PredictedMaintenance, Room } from '@/types'
import { exportToCSV } from '@/utils/export'
import { validateRequired } from '@/utils/validation'
import { fetchBuildings } from '@/services/api/buildingService'
import { fetchRooms } from '@/services/api/roomService'
import { createMaintenance, deleteMaintenance, fetchMaintenance, type MaintenanceUpsertDto, updateMaintenance } from '@/services/api/maintenanceService'
import { convertToScheduled, dismissPrediction, fetchActivePredictions, runPredictiveAnalysis } from '@/services/api/predictiveMaintenanceService'
import { PredictedMaintenanceCard } from '@/components/maintenance/PredictedMaintenanceCard'

function tone(priority: MaintenanceRecord['priority']) {
  if (priority === 'critical') return 'danger'
  if (priority === 'high') return 'warning'
  if (priority === 'medium') return 'info'
  return 'neutral'
}

export default function MaintenancePage() {
  const { push } = useToast()
  const [activeTab, setActiveTab] = useState<'scheduled' | 'predictions'>('scheduled')
  const [items, setItems] = useState<MaintenanceRecord[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [predictions, setPredictions] = useState<PredictedMaintenance[]>([])
  const [predictionsLoading, setPredictionsLoading] = useState(false)
  const [predictionsError, setPredictionsError] = useState<string | null>(null)
  const [analysisRunning, setAnalysisRunning] = useState(false)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 6

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [form, setForm] = useState({
    type: 'building' as MaintenanceRecord['type'],
    targetId: '',
    maintenanceDate: new Date().toISOString().slice(0, 10),
    issueDescription: '',
    resolution: '',
    priority: 'medium' as MaintenanceRecord['priority'],
    status: 'pending' as MaintenanceRecord['status'],
    cost: 0,
  })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [mRes, bRes, rRes] = await Promise.all([
        fetchMaintenance({ page: 1, limit: 300 }),
        fetchBuildings({ page: 1, limit: 200 }),
        fetchRooms({ page: 1, limit: 500 }),
      ])
      setItems(mRes.data)
      setBuildings(bRes.data)
      setRooms(rRes.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  async function loadPredictions() {
    setPredictionsLoading(true)
    setPredictionsError(null)
    try {
      const data = await fetchActivePredictions()
      setPredictions(data)
    } catch (e) {
      setPredictionsError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setPredictionsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    if (activeTab === 'predictions') {
      void loadPredictions()
    }
  }, [activeTab])

  async function handleRunAnalysis() {
    setAnalysisRunning(true)
    try {
      await runPredictiveAnalysis()
      push({ tone: 'success', title: 'Predictive analysis started', message: 'Refresh in a few moments.' })
      window.setTimeout(() => {
        void loadPredictions()
      }, 2500)
    } catch (e) {
      push({ tone: 'error', title: 'Failed to run analysis', message: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      setAnalysisRunning(false)
    }
  }

  async function handleConvert(id: string, date: string, cost?: number) {
    try {
      await convertToScheduled(id, { actualDate: date, actualCost: cost })
      push({ tone: 'success', title: 'Scheduled maintenance created' })
      await Promise.all([loadPredictions(), load()])
    } catch (e) {
      push({ tone: 'error', title: 'Convert failed', message: e instanceof Error ? e.message : 'Unknown error' })
    }
  }

  async function handleDismiss(id: string, reason: string) {
    try {
      await dismissPrediction(id, reason)
      push({ tone: 'success', title: 'Prediction dismissed' })
      await loadPredictions()
    } catch (e) {
      push({ tone: 'error', title: 'Dismiss failed', message: e instanceof Error ? e.message : 'Unknown error' })
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((m) => `${m.targetName} ${m.issueDescription}`.toLowerCase().includes(q))
  }, [items, query])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / pageSize)), [filtered.length])

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page])

  useEffect(() => {
    setPage(1)
  }, [query])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  function typeLabel(t: MaintenanceRecord['type']) {
    return t === 'building' ? 'Building' : 'Room'
  }

  function statusLabel(s: MaintenanceRecord['status']) {
    if (s === 'in_progress') return 'In Progress'
    if (s === 'completed') return 'Completed'
    return 'Pending'
  }

  function priorityLabel(p: MaintenanceRecord['priority']) {
    if (p === 'critical') return 'Critical'
    if (p === 'high') return 'High'
    if (p === 'medium') return 'Medium'
    return 'Low'
  }

  function formatDate(value: string) {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return value
    return d.toLocaleDateString()
  }

  function openAdd() {
    setEditingId(null)
    setForm({
      type: 'building',
      targetId: buildings[0]?.id ?? '',
      maintenanceDate: new Date().toISOString().slice(0, 10),
      issueDescription: '',
      resolution: '',
      priority: 'medium',
      status: 'pending',
      cost: 0,
    })
    setFormErrors({})
    setModalOpen(true)
  }

  function openEdit(id: string) {
    const m = items.find((x) => x.id === id)
    if (!m) return
    setEditingId(id)
    setForm({
      type: m.type,
      targetId: m.targetId,
      maintenanceDate: m.maintenanceDate,
      issueDescription: m.issueDescription,
      resolution: m.resolution ?? '',
      priority: m.priority,
      status: m.status,
      cost: m.cost ?? 0,
    })
    setFormErrors({})
    setModalOpen(true)
  }

  function validate() {
    const next: Record<string, string> = {}
    if (!validateRequired(form.targetId)) next.targetId = 'Required'
    if (!validateRequired(form.issueDescription)) next.issueDescription = 'Required'
    setFormErrors(next)
    return Object.keys(next).length === 0
  }

  function resolveTargetName() {
    if (form.type === 'building') return buildings.find((b) => b.id === form.targetId)?.buildingName ?? 'Unknown'
    return rooms.find((r) => r.id === form.targetId)?.roomNumber ?? 'Unknown'
  }

  async function save() {
    if (!validate()) {
      push({ tone: 'error', title: 'Fix validation errors' })
      return
    }

    try {
      if (editingId) {
        const payload: Partial<MaintenanceUpsertDto> = {
          maintenanceDate: form.maintenanceDate,
          issueDescription: form.issueDescription,
          resolution: form.resolution || undefined,
          priority: form.priority,
          status: form.status,
          cost: form.cost || undefined,
          ...(form.type === 'building' ? { buildingId: form.targetId, roomId: null } : { roomId: form.targetId, buildingId: null }),
        }

        await updateMaintenance(editingId, payload)
        push({ tone: 'success', title: 'Maintenance updated' })
      } else {
        await createMaintenance({
          maintenanceDate: form.maintenanceDate,
          issueDescription: form.issueDescription,
          resolution: form.resolution || undefined,
          priority: form.priority,
          status: form.status,
          cost: form.cost || undefined,
          ...(form.type === 'building' ? { buildingId: form.targetId } : { roomId: form.targetId }),
        })
        push({ tone: 'success', title: 'Maintenance record added' })
      }
      setModalOpen(false)
      await load()
    } catch (e) {
      push({ tone: 'error', title: 'Save failed', message: e instanceof Error ? e.message : 'Unknown error' })
    }
  }

  async function onDeleteConfirm(id: string) {
    try {
      await deleteMaintenance(id)
      push({ tone: 'success', title: 'Maintenance deleted' })
      await load()
    } catch (e) {
      push({ tone: 'error', title: 'Delete failed', message: e instanceof Error ? e.message : 'Unknown error' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-white">Maintenance</div>
          <div className="text-sm text-white/60">Prediction alerts, schedules and records</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={activeTab === 'scheduled' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('scheduled')}
          >
            Scheduled
          </Button>
          <Button
            variant={activeTab === 'predictions' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('predictions')}
          >
            <Sparkles className="h-4 w-4" />
            Predictions
            {predictions.length > 0 ? <span className="ml-1">({predictions.length})</span> : null}
          </Button>

          {activeTab === 'predictions' ? (
            <Button variant="outline" onClick={handleRunAnalysis} disabled={analysisRunning}>
              Run Analysis
            </Button>
          ) : (
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" />
              Add Record
            </Button>
          )}
        </div>
      </div>

      {activeTab === 'predictions' ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Predicted Maintenance</CardTitle>
              <Sparkles className="h-5 w-5 text-white/50" />
            </div>
          </CardHeader>
          <CardContent>
            {predictionsLoading ? (
              <LoadingSkeleton variant="card" count={3} />
            ) : predictionsError ? (
              <ErrorState title="Failed to load predictions" message={predictionsError} onRetry={() => void loadPredictions()} />
            ) : predictions.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="No predictions"
                description="Run predictive analysis to generate maintenance recommendations"
                actionLabel="Run Analysis"
                onAction={() => void handleRunAnalysis()}
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {predictions.map((p) => (
                  <PredictedMaintenanceCard key={p.id} prediction={p} onConvert={handleConvert} onDismiss={handleDismiss} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Maintenance Records</CardTitle>
              <Wrench className="h-5 w-5 text-white/50" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex items-center gap-2">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                <Input className="pl-9" placeholder="Search target or issue" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <Button
                variant="outline"
                onClick={() =>
                  exportToCSV(
                    pageItems.map((m) => ({
                      Target: m.targetName,
                      Type: typeLabel(m.type),
                      Date: formatDate(m.maintenanceDate),
                      Priority: priorityLabel(m.priority),
                      Status: statusLabel(m.status),
                      Issue: m.issueDescription,
                      Resolution: m.resolution ?? '',
                      Cost: m.cost ?? '',
                    })),
                    'maintenance-export',
                  )
                }
              >
                Export CSV
              </Button>
            </div>

            {loading ? (
              <LoadingSkeleton variant="table" count={5} />
            ) : error ? (
              <ErrorState title="Failed to load maintenance" message={error} onRetry={() => void load()} />
            ) : filtered.length === 0 ? (
              <EmptyState icon={Wrench} title="No maintenance records" description="Add your first maintenance record." actionLabel="Add Record" onAction={openAdd} />
            ) : (
              <>
                <div className="space-y-2">
                  {pageItems.map((m) => (
                    <div key={m.id} className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white">{m.targetName}</div>
                          <div className="mt-1 text-sm text-white/70">{m.issueDescription}</div>
                          <div className="mt-2 text-xs text-white/50">{m.maintenanceDate} • {m.type}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge tone={tone(m.priority)}>{m.priority}</Badge>
                          <Badge tone="neutral">{m.status.replace('_', ' ')}</Badge>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-end gap-2">
                        <Button variant="outline" onClick={() => openEdit(m.id)}>
                          Edit
                        </Button>
                        <Button variant="danger" onClick={() => setDeleteId(m.id)}>
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                  <div className="text-white/70">
                    Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filtered.length)} of {filtered.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                      Prev
                    </Button>
                    <div className="text-white/70">Page {page} / {totalPages}</div>
                    <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Schedule Calendar (Preview)</CardTitle>
              <CalendarDays className="h-5 w-5 text-white/50" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-8 text-sm text-white/70 backdrop-blur">
              Calendar UI will be connected to maintenance records and predictions.
            </div>
          </CardContent>
        </Card>
      </div>
      )}

      <Modal
        open={modalOpen}
        title={editingId ? 'Edit Maintenance Record' : 'Add Maintenance Record'}
        description="UI-only (saved to localStorage via mock service)"
        onClose={() => setModalOpen(false)}
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-slate-700">Maintenance Type</label>
            <div className="mt-1">
              <select
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-brand-300"
                value={form.type}
                onChange={(e) => {
                  const nextType = e.target.value as MaintenanceRecord['type']
                  setForm((p) => ({
                    ...p,
                    type: nextType,
                    targetId: nextType === 'building' ? buildings[0]?.id ?? '' : rooms[0]?.id ?? '',
                  }))
                }}
              >
                <option value="building">Building</option>
                <option value="room">Room</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Select Target</label>
            <div className="mt-1">
              <select
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-brand-300"
                value={form.targetId}
                onChange={(e) => setForm((p) => ({ ...p, targetId: e.target.value }))}
              >
                {(form.type === 'building' ? buildings : rooms).map((t) => (
                  <option key={t.id} value={t.id}>
                    {'buildingName' in t ? t.buildingName : t.roomNumber}
                  </option>
                ))}
              </select>
              {formErrors.targetId ? <div className="mt-1 text-xs text-red-600">{formErrors.targetId}</div> : null}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Maintenance Date</label>
            <div className="mt-1">
              <Input type="date" value={form.maintenanceDate} onChange={(e) => setForm((p) => ({ ...p, maintenanceDate: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Priority</label>
            <div className="mt-1">
              <select
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-brand-300"
                value={form.priority}
                onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as MaintenanceRecord['priority'] }))}
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Status</label>
            <div className="mt-1">
              <select
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-brand-300"
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as MaintenanceRecord['status'] }))}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-700">Issue Description</label>
            <div className="mt-1">
              <textarea
                className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-300"
                value={form.issueDescription}
                onChange={(e) => setForm((p) => ({ ...p, issueDescription: e.target.value }))}
              />
              {formErrors.issueDescription ? <div className="mt-1 text-xs text-red-600">{formErrors.issueDescription}</div> : null}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-700">Resolution</label>
            <div className="mt-1">
              <textarea
                className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-300"
                value={form.resolution}
                onChange={(e) => setForm((p) => ({ ...p, resolution: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Cost</label>
            <div className="mt-1">
              <Input type="number" value={form.cost} onChange={(e) => setForm((p) => ({ ...p, cost: Number(e.target.value) }))} />
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => (deleteId ? void onDeleteConfirm(deleteId) : undefined)}
        title="Delete Maintenance Record"
        message="Are you sure you want to delete this record? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  )
}

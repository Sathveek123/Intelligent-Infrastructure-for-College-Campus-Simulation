import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Trash2 } from 'lucide-react'
import Badge from '@/ui/Badge'
import Button from '@/ui/Button'
import Input from '@/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/Card'
import Modal from '@/ui/Modal'
import { useToast } from '@/ui/toast'
import ConfirmDialog from '@/ui/ConfirmDialog'
import EmptyState from '@/ui/EmptyState'
import ErrorState from '@/ui/ErrorState'
import LoadingSkeleton from '@/ui/LoadingSkeleton'
import LoadingOverlay from '@/ui/LoadingOverlay'
import type { Building, Room } from '@/types'
import { exportToCSV } from '@/utils/export'
import { validateNumber, validateRequired } from '@/utils/validation'
import { fetchBuildings } from '@/services/api/buildingService'
import { createRoom, deleteRoom, fetchRooms, updateRoom } from '@/services/api/roomService'

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

function statusTone(status: string): Tone {
  if (status === 'available') return 'success'
  if (status === 'occupied') return 'warning'
  if (status === 'maintenance') return 'danger'
  return 'neutral'
}

export default function RoomsPage() {
  const { push } = useToast()
  const [items, setItems] = useState<Room[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mutating, setMutating] = useState(false)
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const editing = useMemo(() => items.find((r) => r.id === editingId) ?? null, [editingId, items])
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 7

  const [form, setForm] = useState({
    buildingId: '',
    roomNumber: '',
    floor: 1,
    capacity: 30,
    roomType: 'classroom',
    status: 'available',
    equipmentList: '',
    utilizationRate: 0,
  })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [bRes, rRes] = await Promise.all([fetchBuildings({ page: 1, limit: 200 }), fetchRooms({ page: 1, limit: 500 })])
      setBuildings(bRes.data)
      setItems(rRes.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((r) => `${r.roomNumber} ${r.buildingName ?? ''}`.toLowerCase().includes(q))
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

  function openAdd() {
    setEditingId(null)
    setForm({ buildingId: buildings[0]?.id ?? '', roomNumber: '', floor: 1, capacity: 30, roomType: 'classroom', status: 'available', equipmentList: '', utilizationRate: 0 })
    setFormErrors({})
    setModalOpen(true)
  }

  function openEdit(id: string) {
    const r = items.find((x) => x.id === id)
    if (!r) return
    setEditingId(id)
    setForm({
      buildingId: r.buildingId,
      roomNumber: r.roomNumber,
      floor: r.floor,
      capacity: r.capacity,
      roomType: r.roomType,
      status: r.status,
      equipmentList: r.equipmentList ?? '',
      utilizationRate: r.utilizationRate ?? 0,
    })
    setFormErrors({})
    setModalOpen(true)
  }

  function validate() {
    const next: Record<string, string> = {}
    if (!validateRequired(form.roomNumber)) next.roomNumber = 'Required'
    if (!validateRequired(form.buildingId)) next.buildingId = 'Required'
    if (!validateNumber(String(form.capacity), 1)) next.capacity = 'Min 1'
    setFormErrors(next)
    return Object.keys(next).length === 0
  }

  async function save() {
    if (!validate()) {
      push({ tone: 'error', title: 'Fix validation errors' })
      return
    }

    setMutating(true)
    try {
      if (editingId) {
        await updateRoom(editingId, {
          buildingId: form.buildingId,
          roomNumber: form.roomNumber,
          floor: form.floor,
          capacity: form.capacity,
          roomType: form.roomType as Room['roomType'],
          status: form.status as Room['status'],
          equipmentList: form.equipmentList || undefined,
        })
        push({ tone: 'success', title: 'Room updated', message: form.roomNumber })
      } else {
        await createRoom({
          buildingId: form.buildingId,
          roomNumber: form.roomNumber,
          floor: form.floor,
          capacity: form.capacity,
          roomType: form.roomType as Room['roomType'],
          status: form.status as Room['status'],
          equipmentList: form.equipmentList || undefined,
        })
        push({ tone: 'success', title: 'Room added', message: form.roomNumber })
      }
      setModalOpen(false)
      await load()
    } catch (e) {
      push({ tone: 'error', title: 'Save failed', message: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      setMutating(false)
    }
  }

  async function onDeleteConfirm(id: string) {
    const prev = items
    setItems((p) => p.filter((r) => r.id !== id))

    setMutating(true)
    try {
      await deleteRoom(id)
      push({ tone: 'success', title: 'Room deleted' })
    } catch (e) {
      setItems(prev)
      push({ tone: 'error', title: 'Delete failed', message: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      setMutating(false)
      setDeleteId(null)
    }
  }

  return (
    <div className="space-y-6">
      {mutating ? <LoadingOverlay message="Saving…" /> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-white">Rooms</div>
          <div className="text-sm text-white/60">Manage room inventory, status, and utilization</div>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" />
          Add Room
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>All Rooms</CardTitle>
              <div className="mt-1 text-xs text-white/60">Filter by building, type, and status</div>
            </div>
            <div className="flex w-full items-center gap-2 md:w-auto">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                <Input className="pl-9" placeholder="Search room number" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <Button
                variant="outline"
                onClick={() =>
                  exportToCSV(
                    filtered.map((r) => ({
                      roomNumber: r.roomNumber,
                      buildingName: r.buildingName ?? '',
                      floor: r.floor,
                      capacity: r.capacity,
                      roomType: r.roomType,
                      status: r.status,
                      utilizationRate: r.utilizationRate ?? 0,
                    })),
                    'rooms-export',
                  )
                }
              >
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSkeleton variant="table" count={6} />
          ) : error ? (
            <ErrorState title="Failed to load rooms" message={error} onRetry={() => void load()} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No rooms found"
              description="Try a different search or add your first room."
              actionLabel="Add Room"
              onAction={openAdd}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs font-semibold text-white/60">
                    <tr className="border-b border-white/10">
                      <th className="py-3">Room</th>
                      <th className="py-3">Building</th>
                      <th className="py-3">Floor</th>
                      <th className="py-3">Capacity</th>
                      <th className="py-3">Type</th>
                      <th className="py-3">Status</th>
                      <th className="py-3">Utilization</th>
                      <th className="py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((r) => (
                      <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3 font-semibold text-white">{r.roomNumber}</td>
                        <td className="py-3 text-white/80">{r.buildingName ?? '-'}</td>
                        <td className="py-3 text-white/80">{r.floor}</td>
                        <td className="py-3 text-white/80">{r.capacity}</td>
                        <td className="py-3 capitalize text-white/80">{r.roomType.replace('_', ' ')}</td>
                        <td className="py-3">
                          <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-28 rounded-full bg-white/10">
                              <div
                                className="h-2 rounded-full bg-brand-600"
                                style={{ width: `${Math.min(100, r.utilizationRate ?? 0)}%` }}
                              />
                            </div>
                            <div className="text-xs font-semibold text-white/80">{r.utilizationRate ?? 0}%</div>
                          </div>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              className="text-sm font-semibold text-white/80 hover:text-white hover:underline"
                              type="button"
                              onClick={() => openEdit(r.id)}
                            >
                              Edit
                            </button>
                            <button
                              className="inline-flex items-center gap-2 text-sm font-semibold text-red-200 hover:text-red-100 hover:underline"
                              type="button"
                              onClick={() => setDeleteId(r.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                <div className="text-white/70">
                  Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filtered.length)} of {filtered.length}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    Prev
                  </Button>
                  <div className="text-white/70">
                    Page {page} / {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? 'Edit Room' : 'Add Room'}
        description="UI-only form (saved to local state)"
        onClose={() => setModalOpen(false)}
        size="lg"
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
            <label className="text-xs font-semibold text-white/70">Building</label>
            <div className="mt-1">
              <select
                className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/20"
                value={form.buildingId}
                onChange={(e) => setForm((p) => ({ ...p, buildingId: e.target.value }))}
              >
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.buildingName}
                  </option>
                ))}
              </select>
              {formErrors.buildingId ? <div className="mt-1 text-xs text-red-300">{formErrors.buildingId}</div> : null}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-white/70">Room Number</label>
            <div className="mt-1">
              <Input value={form.roomNumber} onChange={(e) => setForm((p) => ({ ...p, roomNumber: e.target.value }))} />
              {formErrors.roomNumber ? <div className="mt-1 text-xs text-red-300">{formErrors.roomNumber}</div> : null}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-white/70">Floor</label>
            <div className="mt-1">
              <Input type="number" value={form.floor} onChange={(e) => setForm((p) => ({ ...p, floor: Number(e.target.value) }))} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-white/70">Capacity</label>
            <div className="mt-1">
              <Input type="number" value={form.capacity} onChange={(e) => setForm((p) => ({ ...p, capacity: Number(e.target.value) }))} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-white/70">Type</label>
            <div className="mt-1">
              <select
                className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/20"
                value={form.roomType}
                onChange={(e) => setForm((p) => ({ ...p, roomType: e.target.value }))}
              >
                <option value="classroom">Classroom</option>
                <option value="lab">Lab</option>
                <option value="seminar_hall">Seminar Hall</option>
                <option value="hostel_room">Hostel Room</option>
                <option value="office">Office</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-white/70">Status</label>
            <div className="mt-1">
              <select
                className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/20"
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
              >
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-white/70">Equipment List</label>
            <div className="mt-1">
              <textarea
                className="min-h-24 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/40 focus:ring-2 focus:ring-brand-500/20"
                value={form.equipmentList}
                onChange={(e) => setForm((p) => ({ ...p, equipmentList: e.target.value }))}
                placeholder="Projector, AC, Computers..."
              />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-white/70">Utilization (%)</label>
            <div className="mt-1">
              <Input
                type="number"
                value={form.utilizationRate}
                onChange={(e) => setForm((p) => ({ ...p, utilizationRate: Math.max(0, Math.min(100, Number(e.target.value))) }))}
              />
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => (deleteId ? void onDeleteConfirm(deleteId) : undefined)}
        title="Delete Room"
        message="Are you sure you want to delete this room? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  )
}

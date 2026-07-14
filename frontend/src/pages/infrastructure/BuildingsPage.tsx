import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Trash2 } from 'lucide-react'
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
import type { Building } from '@/types'
import { exportToCSV } from '@/utils/export'
import { validateNumber, validateRequired, validateYear } from '@/utils/validation'
import { createBuilding, deleteBuilding, fetchBuildings, updateBuilding } from '@/services/api/buildingService'

export default function BuildingsPage() {
  const { push } = useToast()
  const [items, setItems] = useState<Building[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mutating, setMutating] = useState(false)
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 7

  const editing = useMemo(() => items.find((b) => b.id === editingId) ?? null, [editingId, items])

  const [form, setForm] = useState({
    buildingName: '',
    buildingCode: '',
    totalFloors: 1,
    totalRooms: 1,
    constructionYear: 2015,
    buildingType: 'academic' as Building['buildingType'],
    baseEnergyLoad: 100,
  })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchBuildings({ page: 1, limit: 200 })
      setItems(res.data)
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
    return items.filter((b) => `${b.buildingName} ${b.buildingCode}`.toLowerCase().includes(q))
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
    setForm({
      buildingName: '',
      buildingCode: '',
      totalFloors: 1,
      totalRooms: 1,
      constructionYear: 2015,
      buildingType: 'academic',
      baseEnergyLoad: 100,
    })
    setFormErrors({})
    setModalOpen(true)
  }

  function openEdit(id: string) {
    const b = items.find((x) => x.id === id)
    if (!b) return
    setEditingId(id)
    setForm({
      buildingName: b.buildingName,
      buildingCode: b.buildingCode,
      totalFloors: b.totalFloors,
      totalRooms: b.totalRooms,
      constructionYear: b.constructionYear,
      buildingType: b.buildingType,
      baseEnergyLoad: b.baseEnergyLoad,
    })
    setFormErrors({})
    setModalOpen(true)
  }

  function validate() {
    const next: Record<string, string> = {}
    if (!validateRequired(form.buildingName)) next.buildingName = 'Required'
    if (!validateRequired(form.buildingCode)) next.buildingCode = 'Required'
    if (!validateNumber(String(form.totalFloors), 1)) next.totalFloors = 'Min 1'
    if (!validateNumber(String(form.totalRooms), 1)) next.totalRooms = 'Min 1'
    if (!validateYear(form.constructionYear)) next.constructionYear = '1900-2030'
    if (!validateNumber(String(form.baseEnergyLoad), 0)) next.baseEnergyLoad = 'Must be >= 0'
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
        await updateBuilding(editingId, form)
        push({ tone: 'success', title: 'Building updated', message: form.buildingName })
      } else {
        await createBuilding(form)
        push({ tone: 'success', title: 'Building added', message: form.buildingName })
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
    setItems((p) => p.filter((b) => b.id !== id))

    setMutating(true)
    try {
      await deleteBuilding(id)
      push({ tone: 'success', title: 'Building deleted' })
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
          <div className="text-lg font-semibold text-white">Buildings</div>
          <div className="text-sm text-white/60">Search, filter and manage campus buildings</div>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" />
          Add Building
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>All Buildings</CardTitle>
              <div className="mt-1 text-xs text-white/60">Click a building to view detailed occupancy & energy</div>
            </div>
            <div className="flex w-full items-center gap-2 md:w-auto">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                <Input className="pl-9" placeholder="Search by name or code" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <Button
                variant="outline"
                onClick={() =>
                  exportToCSV(
                    filtered.map((b) => ({
                      buildingName: b.buildingName,
                      buildingCode: b.buildingCode,
                      buildingType: b.buildingType,
                      totalFloors: b.totalFloors,
                      totalRooms: b.totalRooms,
                      constructionYear: b.constructionYear,
                      baseEnergyLoad: b.baseEnergyLoad,
                    })),
                    'buildings-export',
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
            <ErrorState title="Failed to load buildings" message={error} onRetry={() => void load()} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No buildings found"
              description="Try a different search or add your first building."
              actionLabel="Add Building"
              onAction={openAdd}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs font-semibold text-white/60">
                    <tr className="border-b border-white/10">
                      <th className="py-3">Building</th>
                      <th className="py-3">Type</th>
                      <th className="py-3">Floors</th>
                      <th className="py-3">Rooms</th>
                      <th className="py-3">Year</th>
                      <th className="py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((b) => (
                      <tr key={b.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3">
                          <div className="font-semibold text-white">{b.buildingName}</div>
                          <div className="text-xs text-white/60">{b.buildingCode}</div>
                        </td>
                        <td className="py-3 capitalize text-white/80">{b.buildingType.replace('_', ' ')}</td>
                        <td className="py-3 text-white/80">{b.totalFloors}</td>
                        <td className="py-3 text-white/80">{b.totalRooms}</td>
                        <td className="py-3 text-white/80">{b.constructionYear}</td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button className="text-sm font-semibold text-white/80 hover:text-white hover:underline" onClick={() => openEdit(b.id)} type="button">
                              Edit
                            </button>
                            <button
                              className="inline-flex items-center gap-2 text-sm font-semibold text-red-200 hover:text-red-100 hover:underline"
                              onClick={() => setDeleteId(b.id)}
                              type="button"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                            <Link to={`/app/infrastructure/buildings/${b.id}`} className="text-sm font-semibold text-blue-200 hover:text-blue-100 hover:underline">
                              View
                            </Link>
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
                  <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
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
        title={editing ? 'Edit Building' : 'Add Building'}
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
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-white/70">Name</label>
            <div className="mt-1">
              <Input value={form.buildingName} onChange={(e) => setForm((p) => ({ ...p, buildingName: e.target.value }))} />
              {formErrors.buildingName ? <div className="mt-1 text-xs text-red-300">{formErrors.buildingName}</div> : null}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-white/70">Code</label>
            <div className="mt-1">
              <Input value={form.buildingCode} onChange={(e) => setForm((p) => ({ ...p, buildingCode: e.target.value }))} />
              {formErrors.buildingCode ? <div className="mt-1 text-xs text-red-300">{formErrors.buildingCode}</div> : null}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-white/70">Type</label>
            <div className="mt-1">
              <select
                className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/20"
                value={form.buildingType}
                onChange={(e) => setForm((p) => ({ ...p, buildingType: e.target.value as Building['buildingType'] }))}
              >
                <option value="academic">Academic</option>
                <option value="administrative">Administrative</option>
                <option value="hostel">Hostel</option>
                <option value="laboratory">Laboratory</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-white/70">Floors</label>
            <div className="mt-1">
              <Input type="number" value={form.totalFloors} onChange={(e) => setForm((p) => ({ ...p, totalFloors: Number(e.target.value) }))} />
              {formErrors.totalFloors ? <div className="mt-1 text-xs text-red-300">{formErrors.totalFloors}</div> : null}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-white/70">Rooms</label>
            <div className="mt-1">
              <Input type="number" value={form.totalRooms} onChange={(e) => setForm((p) => ({ ...p, totalRooms: Number(e.target.value) }))} />
              {formErrors.totalRooms ? <div className="mt-1 text-xs text-red-300">{formErrors.totalRooms}</div> : null}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-white/70">Construction Year</label>
            <div className="mt-1">
              <Input type="number" value={form.constructionYear} onChange={(e) => setForm((p) => ({ ...p, constructionYear: Number(e.target.value) }))} />
              {formErrors.constructionYear ? <div className="mt-1 text-xs text-red-300">{formErrors.constructionYear}</div> : null}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-white/70">Base Energy Load (kWh)</label>
            <div className="mt-1">
              <Input type="number" value={form.baseEnergyLoad} onChange={(e) => setForm((p) => ({ ...p, baseEnergyLoad: Number(e.target.value) }))} />
              {formErrors.baseEnergyLoad ? <div className="mt-1 text-xs text-red-300">{formErrors.baseEnergyLoad}</div> : null}
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => (deleteId ? void onDeleteConfirm(deleteId) : undefined)}
        title="Delete Building"
        message="Are you sure you want to delete this building? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, ShieldCheck, Trash2, UserRound } from 'lucide-react'
import Button from '@/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/Card'
import Input from '@/ui/Input'
import Modal from '@/ui/Modal'
import { useToast } from '@/ui/toast'
import Badge from '@/ui/Badge'
import ConfirmDialog from '@/ui/ConfirmDialog'
import EmptyState from '@/ui/EmptyState'
import ErrorState from '@/ui/ErrorState'
import LoadingSkeleton from '@/ui/LoadingSkeleton'
import type { User } from '@/types'
import { exportToCSV } from '@/utils/export'
import { validateEmail, validateRequired } from '@/utils/validation'
import { createUser, deleteUser, fetchUsers, updateUser } from '@/services/api/userService'

export default function UsersPage() {
  const { push } = useToast()
  const [items, setItems] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const editing = useMemo(() => items.find((u) => u.id === editingId) ?? null, [editingId, items])
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 7

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff', isActive: true })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchUsers({ page: 1, limit: 300 })
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
    return items.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q))
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

  function roleLabel(role: User['role']) {
    if (role === 'admin') return 'Admin'
    return 'Staff'
  }

  function statusLabel(active: boolean) {
    return active ? 'Active' : 'Inactive'
  }

  function formatDate(value: string) {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return value
    return d.toLocaleString()
  }

  function openAdd() {
    setEditingId(null)
    setForm({ name: '', email: '', password: '', role: 'staff', isActive: true })
    setFormErrors({})
    setModalOpen(true)
  }

  function openEdit(id: string) {
    const u = items.find((x) => x.id === id)
    if (!u) return
    setEditingId(id)
    setForm({ name: u.name, email: u.email, password: '', role: u.role, isActive: u.isActive })
    setFormErrors({})
    setModalOpen(true)
  }

  function validate() {
    const next: Record<string, string> = {}
    if (!validateRequired(form.name)) next.name = 'Required'
    if (!validateRequired(form.email)) next.email = 'Required'
    if (form.email && !validateEmail(form.email)) next.email = 'Invalid email'
    if (!editingId && !validateRequired(form.password)) next.password = 'Required for new user'
    setFormErrors(next)
    return Object.keys(next).length === 0
  }

  async function save() {
    if (!validate()) {
      push({ tone: 'error', title: 'Fix validation errors' })
      return
    }

    try {
      if (editingId) {
        await updateUser(editingId, {
          name: form.name,
          email: form.email,
          role: form.role as User['role'],
          isActive: form.isActive,
          ...(form.password ? ({ password: form.password } as const) : {}),
        })
        push({ tone: 'success', title: 'User updated', message: form.name })
      } else {
        await createUser({ name: form.name, email: form.email, password: form.password, role: form.role as User['role'], isActive: form.isActive })
        push({ tone: 'success', title: 'User added', message: form.name })
      }
      setModalOpen(false)
      await load()
    } catch (e) {
      push({ tone: 'error', title: 'Save failed', message: e instanceof Error ? e.message : 'Unknown error' })
    }
  }

  async function onDeleteConfirm(id: string) {
    try {
      await deleteUser(id)
      push({ tone: 'success', title: 'User deleted' })
      await load()
    } catch (e) {
      push({ tone: 'error', title: 'Delete failed', message: e instanceof Error ? e.message : 'Unknown error' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-white">User Management</div>
          <div className="text-sm text-white/60">Roles, activation, resets (admin)</div>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-white/50" />
              <CardTitle>Users</CardTitle>
            </div>
            <div className="flex w-full items-center gap-2 md:w-auto">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                <Input className="pl-9" placeholder="Search name or email" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <Button
                variant="outline"
                onClick={() =>
                  exportToCSV(
                    pageItems.map((u) => ({
                      Name: u.name,
                      Email: u.email,
                      Role: roleLabel(u.role),
                      Status: statusLabel(u.isActive),
                      'Created At': formatDate(u.createdAt),
                    })),
                    'users-export',
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
            <ErrorState title="Failed to load users" message={error} onRetry={() => void load()} />
          ) : filtered.length === 0 ? (
            <EmptyState icon={UserRound} title="No users found" description="Add your first user to manage access." actionLabel="Add User" onAction={openAdd} />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs font-semibold text-white/60">
                    <tr className="border-b border-white/10">
                      <th className="py-3">Name</th>
                      <th className="py-3">Email</th>
                      <th className="py-3">Role</th>
                      <th className="py-3">Status</th>
                      <th className="py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((u) => (
                      <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3 font-semibold text-white">{u.name}</td>
                        <td className="py-3 text-white/80">{u.email}</td>
                        <td className="py-3 text-white/80">{u.role}</td>
                        <td className="py-3">{u.isActive ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Inactive</Badge>}</td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" onClick={() => openEdit(u.id)}>
                              Edit
                            </Button>
                            <Button variant="danger" onClick={() => setDeleteId(u.id)}>
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
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
        title={editing ? 'Edit User' : 'Add User'}
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
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              {formErrors.name ? <div className="mt-1 text-xs text-red-600">{formErrors.name}</div> : null}
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-white/70">Email</label>
            <div className="mt-1">
              <Input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              {formErrors.email ? <div className="mt-1 text-xs text-red-600">{formErrors.email}</div> : null}
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-white/70">Password</label>
            <div className="mt-1">
              <Input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder={editing ? 'Leave blank to keep current' : 'Required'} />
              {formErrors.password ? <div className="mt-1 text-xs text-red-600">{formErrors.password}</div> : null}
              {editing ? <div className="mt-1 text-xs text-white/50">Leave blank to keep current password</div> : null}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-white/70">Role</label>
            <div className="mt-1">
              <select
                className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/20"
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
              >
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-white/70">Status</label>
            <div className="mt-1">
              <select
                className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/20"
                value={form.isActive ? 'active' : 'inactive'}
                onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.value === 'active' }))}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => (deleteId ? void onDeleteConfirm(deleteId) : undefined)}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  )
}

import type { User } from '@/types'
import { addUser, deleteUser as removeUser, fetchUsers as fetchAllUsers, updateUser as patchUser } from '@/services/mockData'

type ListResult<T> = { data: T; meta?: { page: number; limit: number; total: number; totalPages: number } }

function paginate<T>(items: T[], page = 1, limit = 25) {
  const safePage = Math.max(1, Math.floor(page))
  const safeLimit = Math.max(1, Math.floor(limit))
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / safeLimit))
  const clampedPage = Math.min(safePage, totalPages)
  const start = (clampedPage - 1) * safeLimit
  return { data: items.slice(start, start + safeLimit), meta: { page: clampedPage, limit: safeLimit, total, totalPages } }
}

export async function fetchUsers(params?: { page?: number; limit?: number; search?: string }) {
  const all = await fetchAllUsers()
  const q = (params?.search ?? '').trim().toLowerCase()
  const filtered = q
    ? all.filter((u) => `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(q))
    : all
  const { data, meta } = paginate(filtered, params?.page ?? 1, params?.limit ?? 25)
  return { data, meta: meta as ListResult<User[]>['meta'] }
}

export async function createUser(data: { name: string; email: string; password: string; role: User['role']; isActive: boolean }) {
  return await addUser({ name: data.name, email: data.email, role: data.role, isActive: data.isActive })
}

export async function updateUser(id: string, data: Partial<User> & { password?: string }) {
  return await patchUser(id, data)
}

export async function deleteUser(id: string) {
  await removeUser(id)
  return { success: true } as any
}

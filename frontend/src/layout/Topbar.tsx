import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Bell, Menu, Search } from 'lucide-react'
import { useAuth } from '@/context/auth'
import Button from '@/ui/Button'

function titleFromPath(pathname: string) {
  const p = pathname.startsWith('/app/') ? pathname.slice(4) : pathname
  if (p.startsWith('/dashboard')) return 'Dashboard'
  if (p.startsWith('/infrastructure/buildings')) return 'Buildings'
  if (p.startsWith('/infrastructure/rooms')) return 'Rooms'
  if (p.startsWith('/simulation')) return 'Simulation'
  if (p.startsWith('/analytics')) return 'Analytics'
  if (p.startsWith('/maintenance')) return 'Maintenance'
  if (p.startsWith('/reports')) return 'Reports'
  if (p.startsWith('/users')) return 'User Management'
  return 'Campus Management'
}

type TopbarProps = {
  onOpenSidebar?: () => void
}

export default function Topbar({ onOpenSidebar }: TopbarProps) {
  const location = useLocation()
  const { user, logout } = useAuth()

  const title = useMemo(() => titleFromPath(location.pathname), [location.pathname])

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/70 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10 md:hidden"
            aria-label="Open menu"
            onClick={onOpenSidebar}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <div className="text-sm text-white/60">{title}</div>
              <div className="truncate text-base font-semibold text-white">
                Intelligent Infrastructure Simulation Framework
              </div>
            </div>
          </div>
        </div>

        <div className="hidden w-[420px] max-w-[45vw] items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 md:flex">
          <Search className="h-4 w-4 text-white/50" />
          <input
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
            placeholder="Search buildings, rooms, alerts..."
          />
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/app/maintenance"
            className="relative grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-orange-500 px-1 text-[10px] font-semibold text-white">
              3
            </span>
          </Link>

          <div className="hidden items-center gap-3 md:flex">
            <div className="text-right">
              <div className="text-sm font-medium text-white">{user?.name ?? 'User'}</div>
              <div className="text-xs text-white/60">{user?.role ?? 'staff'}</div>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-sm font-semibold text-white">
              {(user?.name ?? 'U')
                .split(' ')
                .map((p) => p[0])
                .slice(0, 2)
                .join('')}
            </div>
          </div>

          <Button variant="outline" onClick={logout}>
            Logout
          </Button>
        </div>
      </div>
    </header>
  )
}

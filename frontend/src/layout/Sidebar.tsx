import { type ReactNode, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Activity,
  HeartPulse,
  Target,
  GitCompare,
  ListOrdered,
  Save,
  Gauge,
  BarChart3,
  Building2,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Settings,
  Shield,
  Zap,
  Wrench,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@/context/auth'

const navItems: Array<{ to: string; label: string; icon: ReactNode }> = [
  { to: '/app/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { to: '/app/infrastructure/buildings', label: 'Buildings', icon: <Building2 className="h-5 w-5" /> },
  { to: '/app/infrastructure/rooms', label: 'Rooms', icon: <Building2 className="h-5 w-5" /> },
  { to: '/app/simulation', label: 'Simulation', icon: <Activity className="h-5 w-5" /> },
  { to: '/app/health', label: 'System Health', icon: <HeartPulse className="h-5 w-5" /> },
  { to: '/app/planning', label: 'Capacity Planning', icon: <Target className="h-5 w-5" /> },
  { to: '/app/comparison', label: 'Compare Buildings', icon: <GitCompare className="h-5 w-5" /> },
  { to: '/app/alerts', label: 'Priority Alerts', icon: <ListOrdered className="h-5 w-5" /> },
  { to: '/app/scenarios', label: 'Scenarios', icon: <Save className="h-5 w-5" /> },
  { to: '/app/benchmarks', label: 'Benchmarks', icon: <Gauge className="h-5 w-5" /> },
  { to: '/app/analytics', label: 'Analytics', icon: <BarChart3 className="h-5 w-5" /> },
  { to: '/app/maintenance', label: 'Maintenance', icon: <Wrench className="h-5 w-5" /> },
  { to: '/app/reports', label: 'Reports', icon: <FileText className="h-5 w-5" /> },
  { to: '/app/users', label: 'Users', icon: <Shield className="h-5 w-5" /> },
]

const adminItems: Array<{ to: string; label: string; icon: ReactNode }> = [
  { to: '/app/admin/audit', label: 'Audit Logs', icon: <Shield className="h-5 w-5" /> },
  { to: '/app/admin/power', label: 'Power Control', icon: <Zap className="h-5 w-5" /> },
]

type SidebarProps = {
  variant?: 'desktop' | 'mobile'
  open?: boolean
  onClose?: () => void
}

export default function Sidebar({ variant = 'desktop', open = false, onClose }: SidebarProps) {
  const isMobile = variant === 'mobile'
  const { user } = useAuth()

  const email = (user?.email ?? '').toString().toLowerCase()
  const isAdmin =
    (user?.role ?? '').toString().toLowerCase() === 'admin' ||
    user?.id === 'u1' ||
    email === 'admin@gmrit.edu.in' ||
    email.startsWith('admin@')
  const allItems = isAdmin ? [...navItems, ...adminItems] : navItems

  const COLLAPSE_KEY = 'i2sf_sidebar_collapsed_v1'
  const [collapsed, setCollapsed] = useState(() => {
    if (isMobile) return false
    const raw = localStorage.getItem(COLLAPSE_KEY)
    return raw === '1'
  })

  const widthClass = isMobile ? 'w-72' : collapsed ? 'w-20' : 'w-64'

  const toggle = () => {
    setCollapsed((v) => {
      const next = !v
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      return next
    })
  }

  const shellClass =
    'border-white/10 bg-gradient-to-b from-slate-950 via-slate-950 to-brand-950/70 text-white backdrop-blur-xl'
  const navLinkClass =
    'group flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-500/20'
  const navIconClass =
    'grid h-9 w-9 place-items-center rounded-2xl border border-white/10 bg-white/5 text-white/70 transition group-hover:bg-white/10 group-hover:text-white'

  const brandTitle = useMemo(() => {
    return (
      <div className="min-w-0 leading-tight">
        <div className="truncate text-xs font-semibold text-white">Intelligent Infrastructure</div>
        <div className="truncate text-[11px] text-white/70">Simulation Framework · GMR Campus</div>
      </div>
    )
  }, [])

  if (isMobile) {
    return (
      <div className={clsx('fixed inset-0 z-40 md:hidden', open ? 'pointer-events-auto' : 'pointer-events-none')}>
        <div
          className={clsx(
            'absolute inset-0 bg-slate-900/40 transition-opacity',
            open ? 'opacity-100' : 'opacity-0',
          )}
          onClick={onClose}
        />
        <aside
          className={clsx(
            `absolute left-0 top-0 h-full ${widthClass} border-r shadow-2xl transition-transform ${shellClass}`,
            open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="relative flex h-16 items-center gap-3 overflow-hidden border-b border-white/10 px-4">
            <div className="pointer-events-none absolute inset-0 opacity-60">
              <div className="landing-orb landing-orb-1" />
              <div className="landing-orb landing-orb-2" />
              <div className="landing-orb landing-orb-3" />
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-white/0 to-white/0" />
            </div>

            <div className="relative z-10 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
              <img
                src="/images/GMR LOGO.png"
                alt="GMR Logo"
                className="h-8 w-auto"
                onError={(e) => {
                  ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                }}
              />
              {brandTitle}
            </div>
          </div>

          <nav className="px-3 py-4">
            <div className="space-y-1">
              {allItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    clsx(
                      navLinkClass,
                      isActive
                        ? 'bg-gradient-to-r from-brand-600/25 via-white/10 to-white/5 text-white ring-1 ring-white/10'
                        : 'text-white/80 hover:bg-white/10 hover:text-white',
                    )
                  }
                >
                  <span className={navIconClass}>{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </div>

            <div className="mt-6 border-t border-white/10 pt-4">
              <NavLink
                to="/app/settings"
                onClick={onClose}
                className={({ isActive }) =>
                  clsx(
                    navLinkClass,
                    isActive
                      ? 'bg-gradient-to-r from-brand-600/25 via-white/10 to-white/5 text-white ring-1 ring-white/10'
                      : 'text-white/80 hover:bg-white/10 hover:text-white',
                  )
                }
              >
                <span className={navIconClass}>
                  <Settings className="h-5 w-5" />
                </span>
                <span>Settings</span>
              </NavLink>
            </div>
          </nav>
        </aside>
      </div>
    )
  }

  return (
    <aside className={clsx(`sticky top-0 hidden h-screen shrink-0 border-r md:block ${widthClass} overflow-hidden`, shellClass)}>
      <div className="relative flex h-16 items-center gap-3 border-b border-white/10 px-4">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="landing-orb landing-orb-1" />
          <div className="landing-orb landing-orb-2" />
          <div className="landing-orb landing-orb-3" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-white/0 to-white/0" />
        </div>

        <div className={clsx('relative z-10 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.25)]', collapsed ? 'w-11 justify-center px-0' : 'w-auto')}>
          <img
            src="/images/GMR LOGO.png"
            alt="GMR Logo"
            className={clsx('h-8 w-auto', collapsed ? 'hidden' : 'block')}
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
          />
          {collapsed ? <LayoutDashboard className="h-5 w-5" /> : brandTitle}
        </div>

        <div className="relative z-10 ml-auto">
          <button
            type="button"
            onClick={toggle}
            className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <nav className="px-3 py-4">
        <div className="space-y-1">
          {allItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  navLinkClass,
                  isActive
                    ? 'bg-gradient-to-r from-brand-600/25 via-white/10 to-white/5 text-white ring-1 ring-white/10'
                    : 'text-white/80 hover:bg-white/10 hover:text-white',
                )
              }
              title={collapsed ? item.label : undefined}
            >
              <span className={navIconClass}>{item.icon}</span>
              <span className={clsx('truncate', collapsed ? 'hidden' : 'block')}>{item.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="mt-6 border-t border-white/10 pt-4">
          <NavLink
            to="/app/settings"
            className={({ isActive }) =>
              clsx(
                navLinkClass,
                isActive
                  ? 'bg-gradient-to-r from-brand-600/25 via-white/10 to-white/5 text-white ring-1 ring-white/10'
                  : 'text-white/80 hover:bg-white/10 hover:text-white',
              )
            }
            title={collapsed ? 'Settings' : undefined}
          >
            <span className={navIconClass}>
              <Settings className="h-5 w-5" />
            </span>
            <span className={collapsed ? 'hidden' : 'block'}>Settings</span>
          </NavLink>
        </div>
      </nav>
    </aside>
  )
}

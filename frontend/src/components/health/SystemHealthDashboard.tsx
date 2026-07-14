import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import Badge from '@/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/Card'
import { fetchAllBuildingMetrics } from '@/services/api/metricsService'
import type { BuildingMetrics, MaintenanceRecord } from '@/types'
import type { PowerGrid } from '@/types/gridModel'

type HealthStatus = 'healthy' | 'warning' | 'critical'

type HealthCheck = {
  name: string
  status: HealthStatus
  message: string
  lastCheck: string
}

const KEYS = {
  buildings: 'i2sf_buildings_v1',
  maintenance: 'i2sf_maintenance_v1',
  grid: 'i2sf_power_grid_v1',
  virtualTime: 'i2sf_virtual_time_v1',
} as const

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function statusTone(s: HealthStatus) {
  if (s === 'healthy') return 'success'
  if (s === 'warning') return 'warning'
  return 'danger'
}

function statusIcon(s: HealthStatus) {
  if (s === 'healthy') return CheckCircle
  if (s === 'warning') return AlertTriangle
  return XCircle
}

export default function SystemHealthDashboard({ isLight }: { isLight?: boolean }) {
  const [checks, setChecks] = useState<HealthCheck[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true

    async function runHealthChecks() {
      const now = new Date().toISOString()
      const next: HealthCheck[] = []

      // Check 1: Data integrity
      try {
        const buildingsRaw = localStorage.getItem(KEYS.buildings)
        const buildings = safeParse<any[]>(buildingsRaw, [])
        next.push({
          name: 'Data Integrity',
          status: buildings.length > 0 ? 'healthy' : 'warning',
          message: buildings.length > 0 ? `${buildings.length} buildings loaded` : 'No buildings found',
          lastCheck: now,
        })
      } catch {
        next.push({
          name: 'Data Integrity',
          status: 'critical',
          message: 'Local data corruption detected',
          lastCheck: now,
        })
      }

      // Check 2: Grid status
      const grid = safeParse<PowerGrid | null>(localStorage.getItem(KEYS.grid), null)
      const util = typeof grid?.utilization === 'number' ? grid.utilization : 0
      next.push({
        name: 'Power Grid',
        status: util > 90 ? 'critical' : util > 75 ? 'warning' : 'healthy',
        message: `Utilization: ${util.toFixed(0)}%`,
        lastCheck: now,
      })

      // Check 3: Critical maintenance
      const maintenance = safeParse<MaintenanceRecord[]>(localStorage.getItem(KEYS.maintenance), [])
      const pending = maintenance.filter((m) => m.status === 'pending' || m.status === 'in_progress')
      const critical = pending.filter((m) => m.priority === 'critical').length
      next.push({
        name: 'Maintenance Backlog',
        status: critical > 3 ? 'critical' : critical > 0 ? 'warning' : 'healthy',
        message: `${pending.length} open items (${critical} critical)`,
        lastCheck: now,
      })

      // Check 4: Building health summary
      try {
        const metrics: BuildingMetrics[] = await fetchAllBuildingMetrics()
        const criticalBuildings = metrics.filter((m) => m.healthStatus === 'critical').length
        const moderateBuildings = metrics.filter((m) => m.healthStatus === 'moderate').length
        next.push({
          name: 'Building Health',
          status: criticalBuildings > 2 ? 'critical' : criticalBuildings > 0 || moderateBuildings > 4 ? 'warning' : 'healthy',
          message:
            criticalBuildings > 0
              ? `${criticalBuildings} critical, ${moderateBuildings} moderate`
              : moderateBuildings > 0
                ? `${moderateBuildings} moderate, rest healthy`
                : 'All buildings healthy',
          lastCheck: now,
        })
      } catch (e) {
        next.push({
          name: 'Building Health',
          status: 'warning',
          message: e instanceof Error ? e.message : 'Unable to calculate building health',
          lastCheck: now,
        })
      }

      // Check 5: Virtual time engine
      const vtRaw = localStorage.getItem(KEYS.virtualTime)
      next.push({
        name: 'Time Engine',
        status: vtRaw ? 'healthy' : 'warning',
        message: vtRaw ? 'Virtual time active' : 'Virtual time not initialized',
        lastCheck: now,
      })

      if (!alive) return
      setChecks(next)
      setLoading(false)
    }

    void runHealthChecks()
    const id = window.setInterval(() => void runHealthChecks(), 60000)

    return () => {
      alive = false
      window.clearInterval(id)
    }
  }, [])

  const overall: HealthStatus = useMemo(() => {
    if (checks.some((c) => c.status === 'critical')) return 'critical'
    if (checks.some((c) => c.status === 'warning')) return 'warning'
    return 'healthy'
  }, [checks])

  const OverallIcon = statusIcon(overall)

  return (
    <div className="space-y-6">
      <Card className={isLight ? 'border border-slate-900/10 bg-white' : undefined}>
        <CardHeader className={isLight ? 'border-slate-900/10' : undefined}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className={isLight ? 'text-slate-900' : undefined}>System Health Check</CardTitle>
              <div className={isLight ? 'mt-1 text-xs text-slate-600' : 'mt-1 text-xs text-white/60'}>
                One page answer: is everything OK?
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={statusTone(overall)}>{overall.toUpperCase()}</Badge>
              <div className={isLight ? 'rounded-xl border border-slate-900/10 bg-slate-900/5 p-2 text-slate-700' : 'rounded-xl border border-white/10 bg-white/5 p-2 text-white/70'}>
                <OverallIcon className="h-4 w-4" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className={isLight ? 'text-sm text-slate-700' : 'text-sm text-white/70'}>
            {overall === 'healthy'
              ? 'All subsystems are operating within expected thresholds.'
              : overall === 'warning'
                ? 'Some issues detected. Review checks below.'
                : 'Critical issues detected. Immediate attention recommended.'}
          </div>
          <div className={isLight ? 'mt-3 flex items-center gap-2 text-xs text-slate-600' : 'mt-3 flex items-center gap-2 text-xs text-white/50'}>
            <Activity className="h-4 w-4" />
            Auto refresh: every 60 seconds
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <Card className={isLight ? 'border border-slate-900/10 bg-white' : undefined}>
            <CardContent>
              <div className={isLight ? 'text-sm text-slate-700' : 'text-sm text-white/70'}>Running checks…</div>
            </CardContent>
          </Card>
        ) : (
          checks.map((c) => {
            const Icon = statusIcon(c.status)
            return (
              <Card key={c.name} className={isLight ? 'border border-slate-900/10 bg-white' : undefined}>
                <CardHeader className={isLight ? 'border-slate-900/10' : undefined}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className={isLight ? 'text-slate-900' : undefined}>{c.name}</CardTitle>
                      <div className={isLight ? 'mt-1 text-xs text-slate-600' : 'mt-1 text-xs text-white/60'}>
                        Last check: {new Date(c.lastCheck).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className={isLight ? 'rounded-xl border border-slate-900/10 bg-slate-900/5 p-2 text-slate-700' : 'rounded-xl border border-white/10 bg-white/5 p-2 text-white/70'}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between gap-2">
                    <div className={isLight ? 'text-sm text-slate-700' : 'text-sm text-white/70'}>{c.message}</div>
                    <Badge tone={statusTone(c.status)}>{c.status.toUpperCase()}</Badge>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}

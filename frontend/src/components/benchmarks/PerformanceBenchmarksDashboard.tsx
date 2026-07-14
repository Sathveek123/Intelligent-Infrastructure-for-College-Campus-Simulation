import { useEffect, useMemo, useState } from 'react'
import { Gauge, TrendingDown, TrendingUp } from 'lucide-react'
import Badge from '@/ui/Badge'
import Button from '@/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/Card'
import { fetchAllBuildingMetrics } from '@/services/api/metricsService'
import { fetchBuildings, fetchMaintenance } from '@/services/mockData'
import type { Building, BuildingMetrics, MaintenanceRecord } from '@/types'
import type { PowerGrid } from '@/types/gridModel'

type MetricRow = {
  id: string
  label: string
  current: number
  optimal: number
  unit: string
  gap: number
  direction: 'higher_better' | 'lower_better'
  status: 'good' | 'warning' | 'critical'
  note: string
}

const KEYS = {
  grid: 'i2sf_power_grid_v1',
} as const

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function estimateCapacity(b: Building) {
  const rooms = typeof b.totalRooms === 'number' ? b.totalRooms : 0
  return Math.max(0, Math.round(rooms * 40))
}

function estimateOccupancy(b: Building) {
  const cap = estimateCapacity(b)
  const rate = typeof b.occupancyRate === 'number' ? b.occupancyRate : 0
  return Math.max(0, Math.round((rate / 100) * cap))
}

function toneFor(status: MetricRow['status']) {
  if (status === 'good') return 'success'
  if (status === 'warning') return 'warning'
  return 'danger'
}

export default function PerformanceBenchmarksDashboard({ isLight }: { isLight?: boolean }) {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<MetricRow[]>([])
  const [error, setError] = useState<string | null>(null)

  async function compute() {
    setLoading(true)
    setError(null)

    try {
      const [buildings, maintenance, metrics] = await Promise.all([fetchBuildings(), fetchMaintenance(), fetchAllBuildingMetrics()])
      const grid = safeParse<PowerGrid | null>(localStorage.getItem(KEYS.grid), null)

      const totalCapacity = buildings.reduce((s, b) => s + estimateCapacity(b), 0)
      const totalOcc = buildings.reduce((s, b) => s + estimateOccupancy(b), 0)
      const utilization = totalCapacity > 0 ? (totalOcc / totalCapacity) * 100 : 0

      const avgBaseLoad = buildings.length ? buildings.reduce((s, b) => s + (typeof b.baseEnergyLoad === 'number' ? b.baseEnergyLoad : 0), 0) / buildings.length : 0
      const optimalBaseLoad = avgBaseLoad * 0.88

      const gridUtil = typeof grid?.utilization === 'number' ? grid.utilization : 0

      const openMaint = maintenance.filter((m) => m.status === 'pending' || m.status === 'in_progress')
      const criticalOpen = openMaint.filter((m) => m.priority === 'critical').length

      const avgHealth = metrics.length ? metrics.reduce((s, m) => s + (typeof m.healthScore === 'number' ? m.healthScore : 0), 0) / metrics.length : 0

      const derived: MetricRow[] = []

      // Occupancy utilization target (not too low and not too high)
      const occOptimal = 75
      const occGap = utilization - occOptimal
      derived.push({
        id: 'occupancy_utilization',
        label: 'Campus Utilization',
        current: utilization,
        optimal: occOptimal,
        unit: '%',
        gap: occGap,
        direction: 'lower_better',
        status: utilization > 92 ? 'critical' : utilization > 82 ? 'warning' : utilization < 40 ? 'warning' : 'good',
        note: utilization > 82 ? 'High congestion risk' : 'Balanced capacity usage',
      })

      // Energy efficiency proxy
      const energyGap = avgBaseLoad - optimalBaseLoad
      derived.push({
        id: 'energy_efficiency',
        label: 'Energy Efficiency (avg base load)',
        current: avgBaseLoad,
        optimal: optimalBaseLoad,
        unit: 'kW',
        gap: energyGap,
        direction: 'lower_better',
        status: avgBaseLoad > optimalBaseLoad * 1.2 ? 'warning' : avgBaseLoad > optimalBaseLoad * 1.35 ? 'critical' : 'good',
        note: avgBaseLoad > optimalBaseLoad ? 'Consider retrofits and load optimization' : 'Within target range',
      })

      // Grid utilization
      derived.push({
        id: 'grid_util',
        label: 'Grid Utilization',
        current: gridUtil,
        optimal: 70,
        unit: '%',
        gap: gridUtil - 70,
        direction: 'lower_better',
        status: gridUtil > 95 ? 'critical' : gridUtil > 85 ? 'warning' : 'good',
        note: gridUtil > 85 ? 'Upgrade capacity or shed load' : 'Healthy headroom available',
      })

      // Building health
      derived.push({
        id: 'health_avg',
        label: 'Average Building Health',
        current: avgHealth,
        optimal: 85,
        unit: '/100',
        gap: avgHealth - 85,
        direction: 'higher_better',
        status: avgHealth < 55 ? 'critical' : avgHealth < 70 ? 'warning' : 'good',
        note: avgHealth < 70 ? 'Increase preventive maintenance investment' : 'Healthy overall score',
      })

      // Maintenance backlog
      derived.push({
        id: 'maintenance_backlog',
        label: 'Open Maintenance Items',
        current: openMaint.length,
        optimal: 8,
        unit: 'items',
        gap: openMaint.length - 8,
        direction: 'lower_better',
        status: criticalOpen > 3 ? 'critical' : openMaint.length > 20 ? 'warning' : 'good',
        note: criticalOpen ? `${criticalOpen} critical items need attention` : 'Backlog within control',
      })

      // Normalize + sort by severity
      const score = (s: MetricRow['status']) => (s === 'critical' ? 3 : s === 'warning' ? 2 : 1)
      derived.sort((a, b) => score(b.status) - score(a.status))

      setRows(derived)
      setLoading(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to compute benchmarks')
      setLoading(false)
    }
  }

  useEffect(() => {
    void compute()
  }, [])

  const overall = useMemo(() => {
    if (rows.some((r) => r.status === 'critical')) return 'critical'
    if (rows.some((r) => r.status === 'warning')) return 'warning'
    return 'good'
  }, [rows])

  const overallTone = overall === 'good' ? 'success' : overall === 'warning' ? 'warning' : 'danger'

  return (
    <div className="space-y-6">
      <Card className={isLight ? 'border border-slate-900/10 bg-white' : undefined}>
        <CardHeader className={isLight ? 'border-slate-900/10' : undefined}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className={isLight ? 'text-slate-900' : undefined}>Performance Benchmarks</CardTitle>
              <div className={isLight ? 'mt-1 text-xs text-slate-600' : 'mt-1 text-xs text-white/60'}>
                Current vs optimal targets (campus-level)
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={overallTone as any}>{overall.toUpperCase()}</Badge>
              <Button variant="outline" onClick={() => void compute()}>
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className={isLight ? 'text-sm text-slate-700' : 'text-sm text-white/70'}>Computing…</div>
          ) : error ? (
            <div className={isLight ? 'text-sm text-red-600' : 'text-sm text-red-300'}>{error}</div>
          ) : (
            <div className="space-y-3">
              {rows.map((r) => {
                const better = r.direction === 'higher_better' ? r.current >= r.optimal : r.current <= r.optimal
                const TrendIcon = better ? TrendingUp : TrendingDown

                const currentLabel = r.unit === '%' ? `${r.current.toFixed(1)}%` : `${Math.round(r.current)} ${r.unit}`
                const optimalLabel = r.unit === '%' ? `${r.optimal.toFixed(1)}%` : `${Math.round(r.optimal)} ${r.unit}`

                const ratio = r.direction === 'higher_better' ? (r.optimal > 0 ? r.current / r.optimal : 1) : (r.current > 0 ? r.optimal / r.current : 1)
                const progress = clamp(ratio, 0, 1)

                return (
                  <div
                    key={r.id}
                    className={
                      isLight
                        ? 'rounded-3xl border border-slate-900/10 bg-slate-900/5 p-4'
                        : 'rounded-3xl border border-white/10 bg-white/5 p-4'
                    }
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Gauge className={isLight ? 'h-4 w-4 text-slate-600' : 'h-4 w-4 text-white/60'} />
                          <div className={isLight ? 'truncate text-sm font-semibold text-slate-900' : 'truncate text-sm font-semibold text-white'}>
                            {r.label}
                          </div>
                          <Badge tone={toneFor(r.status) as any}>{r.status.toUpperCase()}</Badge>
                        </div>
                        <div className={isLight ? 'mt-1 text-xs text-slate-600' : 'mt-1 text-xs text-white/60'}>{r.note}</div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className={isLight ? 'text-sm font-semibold text-slate-900' : 'text-sm font-semibold text-white'}>
                            {currentLabel}
                          </div>
                          <div className={isLight ? 'text-xs text-slate-600' : 'text-xs text-white/50'}>
                            target: {optimalLabel}
                          </div>
                        </div>
                        <div className={isLight ? 'rounded-2xl border border-slate-900/10 bg-white p-2 text-slate-700' : 'rounded-2xl border border-white/10 bg-slate-950/30 p-2 text-white/70'}>
                          <TrendIcon className="h-4 w-4" />
                        </div>
                      </div>
                    </div>

                    <div className={isLight ? 'mt-3 h-2 rounded-full bg-slate-900/10' : 'mt-3 h-2 rounded-full bg-white/10'}>
                      <div
                        className={
                          r.status === 'critical'
                            ? 'h-2 rounded-full bg-red-500'
                            : r.status === 'warning'
                              ? 'h-2 rounded-full bg-amber-500'
                              : 'h-2 rounded-full bg-emerald-500'
                        }
                        style={{ width: `${Math.round(progress * 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

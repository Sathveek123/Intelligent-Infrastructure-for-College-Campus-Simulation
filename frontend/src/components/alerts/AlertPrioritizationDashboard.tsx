import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Building2, Clock, ListOrdered, Users, Wrench, Zap } from 'lucide-react'
import Badge from '@/ui/Badge'
import Button from '@/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/Card'
import { fetchAllBuildingMetrics } from '@/services/api/metricsService'
import { fetchBuildings } from '@/services/mockData'
import type { Building, BuildingMetrics, MaintenanceRecord } from '@/types'
import type { PowerGrid } from '@/types/gridModel'

type PrioritizedAlert = {
  id: string
  type: 'grid' | 'health' | 'maintenance' | 'occupancy'
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  affected: string
  estimatedImpact: string
  urgencyScore: number
  timeToAction: string
  createdAt: string
  acknowledged: boolean
}

const KEYS = {
  grid: 'i2sf_power_grid_v1',
  maintenance: 'i2sf_maintenance_v1',
  ack: 'i2sf_priority_alerts_ack_v1',
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

function severityTone(s: PrioritizedAlert['severity']) {
  if (s === 'critical') return 'danger'
  if (s === 'high') return 'warning'
  if (s === 'medium') return 'info'
  return 'neutral'
}

function scoreSeverity(score: number): PrioritizedAlert['severity'] {
  if (score >= 85) return 'critical'
  if (score >= 70) return 'high'
  if (score >= 50) return 'medium'
  return 'low'
}

function nowIso() {
  return new Date().toISOString()
}

function makeId(prefix: string, stableKey: string) {
  // stable ID so acknowledgements survive refresh
  return `${prefix}_${stableKey}`
}

function readAckMap() {
  return safeParse<Record<string, boolean>>(localStorage.getItem(KEYS.ack), {})
}

function writeAckMap(map: Record<string, boolean>) {
  localStorage.setItem(KEYS.ack, JSON.stringify(map))
}

function estimateBuildingCapacity(b: Building) {
  const rooms = typeof b.totalRooms === 'number' ? b.totalRooms : 0
  return Math.max(1, rooms * 40)
}

export default function AlertPrioritizationDashboard({ isLight }: { isLight?: boolean }) {
  const [alerts, setAlerts] = useState<PrioritizedAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'unacknowledged' | 'critical' | 'all'>('unacknowledged')

  async function generateAlerts() {
    setLoading(true)

    const ack = readAckMap()
    const next: PrioritizedAlert[] = []

    // 1) Grid alert
    const grid = safeParse<PowerGrid | null>(localStorage.getItem(KEYS.grid), null)
    const util = typeof grid?.utilization === 'number' ? grid.utilization : 0
    if (util >= 75) {
      const urgency = clamp(util, 0, 100)
      next.push({
        id: makeId('grid', 'campus'),
        type: 'grid',
        severity: util >= 95 ? 'critical' : util >= 85 ? 'high' : 'medium',
        title: 'Grid Capacity Warning',
        description: `Campus grid at ${util.toFixed(0)}% utilization`,
        affected: 'Campus-wide',
        estimatedImpact: util >= 95 ? 'Imminent blackout risk' : util >= 85 ? 'Transformer overload risk' : 'High load stress',
        urgencyScore: urgency,
        timeToAction: util >= 95 ? 'Immediate' : util >= 85 ? '1 hour' : 'Today',
        createdAt: nowIso(),
        acknowledged: Boolean(ack[makeId('grid', 'campus')]),
      })
    }

    // 2) Building health alerts
    let metrics: BuildingMetrics[] = []
    try {
      metrics = await fetchAllBuildingMetrics()
    } catch {
      metrics = []
    }

    for (const m of metrics) {
      if (m.healthStatus !== 'critical') continue
      const urgency = clamp(100 - (typeof m.healthScore === 'number' ? m.healthScore : 0), 0, 100)
      const id = makeId('health', m.buildingId)
      next.push({
        id,
        type: 'health',
        severity: 'critical',
        title: `Critical Health: ${m.buildingName}`,
        description: `Health score at ${m.healthScore}%`,
        affected: m.buildingName,
        estimatedImpact: 'Infrastructure failure risk',
        urgencyScore: urgency,
        timeToAction: '24 hours',
        createdAt: nowIso(),
        acknowledged: Boolean(ack[id]),
      })
    }

    // 3) Maintenance alerts (critical/high pending)
    const maintenance = safeParse<MaintenanceRecord[]>(localStorage.getItem(KEYS.maintenance), [])
    const pending = maintenance.filter((m) => m.status === 'pending' || m.status === 'in_progress')

    for (const m of pending) {
      if (m.priority !== 'critical' && m.priority !== 'high') continue
      const base = m.priority === 'critical' ? 90 : 72
      const id = makeId('maint', m.id)
      next.push({
        id,
        type: 'maintenance',
        severity: m.priority === 'critical' ? 'critical' : 'high',
        title: m.priority === 'critical' ? 'Critical Maintenance Pending' : 'High Priority Maintenance',
        description: `${m.targetName}: ${m.issueDescription}`,
        affected: m.targetName,
        estimatedImpact: m.priority === 'critical' ? 'Service disruption possible' : 'Degradation risk',
        urgencyScore: base,
        timeToAction: m.priority === 'critical' ? '48 hours' : '1 week',
        createdAt: nowIso(),
        acknowledged: Boolean(ack[id]),
      })
    }

    // 4) Occupancy overload
    let buildings: Building[] = []
    try {
      buildings = await fetchBuildings()
    } catch {
      buildings = []
    }

    for (const b of buildings) {
      const rate = typeof b.occupancyRate === 'number' ? b.occupancyRate : 0
      if (rate < 85) continue

      const capacity = estimateBuildingCapacity(b)
      const occ = Math.round((rate / 100) * capacity)

      const urgency = clamp(rate, 0, 100)
      const id = makeId('occ', b.id)
      next.push({
        id,
        type: 'occupancy',
        severity: scoreSeverity(urgency),
        title: `Overcrowding: ${b.buildingName}`,
        description: `${rate.toFixed(0)}% utilization (${occ}/${capacity})`,
        affected: b.buildingName,
        estimatedImpact: rate >= 95 ? 'Safety and comfort degradation' : 'High stress',
        urgencyScore: urgency,
        timeToAction: rate >= 95 ? '2 hours' : 'Today',
        createdAt: nowIso(),
        acknowledged: Boolean(ack[id]),
      })
    }

    next.sort((a, b) => b.urgencyScore - a.urgencyScore)

    setAlerts(next)
    setLoading(false)
  }

  useEffect(() => {
    void generateAlerts()
    const id = window.setInterval(() => void generateAlerts(), 30000)
    return () => window.clearInterval(id)
  }, [])

  function acknowledgeAlert(id: string) {
    const ack = readAckMap()
    ack[id] = true
    writeAckMap(ack)
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)))
  }

  const filtered = useMemo(() => {
    if (filter === 'critical') return alerts.filter((a) => a.severity === 'critical')
    if (filter === 'unacknowledged') return alerts.filter((a) => !a.acknowledged)
    return alerts
  }, [alerts, filter])

  const iconForType = {
    grid: Zap,
    health: Building2,
    maintenance: Wrench,
    occupancy: Users,
  } as const

  return (
    <div className="space-y-6">
      <Card className={isLight ? 'border border-slate-900/10 bg-white' : undefined}>
        <CardHeader className={isLight ? 'border-slate-900/10' : undefined}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className={isLight ? 'text-slate-900' : undefined}>Alert Priority Queue</CardTitle>
              <div className={isLight ? 'mt-1 text-xs text-slate-600' : 'mt-1 text-xs text-white/60'}>
                Sorted by urgency and impact (auto refresh 30s)
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="info">{alerts.length} alerts</Badge>
              <div className={isLight ? 'rounded-xl border border-slate-900/10 bg-slate-900/5 p-2 text-slate-700' : 'rounded-xl border border-white/10 bg-white/5 p-2 text-white/70'}>
                <ListOrdered className="h-4 w-4" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {([
                { key: 'unacknowledged', label: 'Unacknowledged' },
                { key: 'critical', label: 'Critical' },
                { key: 'all', label: 'All' },
              ] as const).map((x) => (
                <button
                  key={x.key}
                  type="button"
                  onClick={() => setFilter(x.key)}
                  className={
                    x.key === filter
                      ? isLight
                        ? 'h-9 rounded-xl border border-brand-500/30 bg-brand-600 px-3 text-sm font-semibold text-white'
                        : 'h-9 rounded-xl border border-white/20 bg-white/10 px-3 text-sm font-semibold text-white'
                      : isLight
                        ? 'h-9 rounded-xl border border-slate-900/10 bg-slate-900/5 px-3 text-sm font-semibold text-slate-800 hover:bg-slate-900/10'
                        : 'h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white'
                  }
                >
                  {x.label}
                </button>
              ))}
            </div>

            <Button variant="outline" onClick={() => void generateAlerts()}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card className={isLight ? 'border border-slate-900/10 bg-white' : undefined}>
          <CardContent>
            <div className={isLight ? 'text-sm text-slate-700' : 'text-sm text-white/70'}>Loading alerts…</div>
          </CardContent>
        </Card>
      ) : filtered.length ? (
        <div className="space-y-3">
          {filtered.map((a) => {
            const Icon = iconForType[a.type]
            return (
              <Card key={a.id} className={isLight ? 'border border-slate-900/10 bg-white' : undefined}>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className={isLight ? 'mt-0.5 rounded-xl border border-slate-900/10 bg-slate-900/5 p-2 text-slate-700' : 'mt-0.5 rounded-xl border border-white/10 bg-white/5 p-2 text-white/70'}>
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className={isLight ? 'truncate text-sm font-semibold text-slate-900' : 'truncate text-sm font-semibold text-white'}>
                            {a.title}
                          </div>
                          <Badge tone={severityTone(a.severity) as any}>{a.severity.toUpperCase()}</Badge>
                          <div className={isLight ? 'flex items-center gap-1 text-xs text-slate-600' : 'flex items-center gap-1 text-xs text-white/60'}>
                            <Clock className="h-3.5 w-3.5" />
                            {a.timeToAction}
                          </div>
                        </div>

                        <div className={isLight ? 'mt-1 text-sm text-slate-700' : 'mt-1 text-sm text-white/70'}>{a.description}</div>

                        <div className={isLight ? 'mt-2 text-xs text-slate-600' : 'mt-2 text-xs text-white/50'}>
                          Affected: <span className={isLight ? 'font-semibold text-slate-700' : 'font-semibold text-white/70'}>{a.affected}</span>
                          <span className="mx-2">•</span>
                          Impact: {a.estimatedImpact}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className={isLight ? 'text-2xl font-semibold text-slate-900' : 'text-2xl font-semibold text-white'}>{Math.round(a.urgencyScore)}</div>
                        <div className={isLight ? 'text-xs text-slate-600' : 'text-xs text-white/50'}>priority</div>
                      </div>

                      {!a.acknowledged ? (
                        <Button variant="outline" onClick={() => acknowledgeAlert(a.id)}>
                          Acknowledge
                        </Button>
                      ) : (
                        <Badge tone="success">ACK</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className={isLight ? 'border border-slate-900/10 bg-white' : undefined}>
          <CardContent className="p-10 text-center">
            <AlertTriangle className={isLight ? 'mx-auto h-10 w-10 text-slate-400' : 'mx-auto h-10 w-10 text-white/40'} />
            <div className={isLight ? 'mt-3 text-sm font-semibold text-slate-900' : 'mt-3 text-sm font-semibold text-white'}>No alerts</div>
            <div className={isLight ? 'mt-1 text-sm text-slate-600' : 'mt-1 text-sm text-white/60'}>System is operating normally.</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

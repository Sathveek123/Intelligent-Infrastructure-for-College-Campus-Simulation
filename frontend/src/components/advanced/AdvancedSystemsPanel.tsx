import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, Calendar, Cpu, GitPullRequestArrow, Power, Wrench } from 'lucide-react'
import Badge from '@/ui/Badge'
import Button from '@/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/Card'
import { eventEngine } from '@/services/eventEngine'
import { agingEngine } from '@/services/agingEngine'
import { gridEngine } from '@/services/gridEngine'
import { dependencyEngine } from '@/services/dependencyEngine'
import { fetchBuildings } from '@/services/mockData'
import type { CampusEvent } from '@/types/eventModel'
import type { Building } from '@/types'

function formatDay(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default function AdvancedSystemsPanel({ isLight }: { isLight?: boolean }) {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [activeEvents, setActiveEvents] = useState<CampusEvent[]>([])
  const [grid, setGrid] = useState(() => gridEngine.getGrid())
  const [gridAlerts, setGridAlerts] = useState(() => gridEngine.getAlerts())
  const [overflowHistory, setOverflowHistory] = useState(() => dependencyEngine.getOverflowHistory(6))

  useEffect(() => {
    let mounted = true

    async function load() {
      const b = await fetchBuildings()
      if (!mounted) return
      setBuildings(b)
      agingEngine.ensureBuildings(b)
      setActiveEvents(eventEngine.getActiveEvents())
      setOverflowHistory(dependencyEngine.getOverflowHistory(6))
      setGridAlerts(gridEngine.getAlerts())
    }

    void load()

    const unsub = gridEngine.subscribe((g) => {
      setGrid({ ...g })
      setGridAlerts(gridEngine.getAlerts())
    })

    const timer = window.setInterval(() => {
      setActiveEvents(eventEngine.getActiveEvents())
      setOverflowHistory(dependencyEngine.getOverflowHistory(6))
      setGridAlerts(gridEngine.getAlerts())
    }, 5000)

    return () => {
      mounted = false
      unsub()
      window.clearInterval(timer)
    }
  }, [])

  const agingSummary = useMemo(() => {
    const all = buildings.map((b) => agingEngine.getAgingData(b.id)).filter(Boolean)
    const avg = all.length ? all.reduce((a, x) => a + (x?.degradationFactor ?? 1), 0) / all.length : 1
    const older = all.filter((x) => (x?.currentAge ?? 0) >= 20).length
    const highLoss = all.filter((x) => (x?.efficiencyLoss ?? 0) >= 20).length
    return { avgConditionPct: Math.round(avg * 100), older, highLoss }
  }, [buildings])

  const utilColor = grid.utilization > 90 ? 'danger' : grid.utilization > 75 ? 'warning' : 'success'

  const shell = isLight ? 'border-slate-900/10 bg-white/95' : 'border-white/10 bg-white/5'
  const textSoft = isLight ? 'text-slate-600' : 'text-white/60'
  const textHard = isLight ? 'text-slate-900' : 'text-white'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className={isLight ? 'text-base font-semibold text-slate-900' : 'text-base font-semibold text-white'}>Advanced Systems</div>
          <div className={isLight ? 'text-sm text-slate-600' : 'text-sm text-white/60'}>Events • Aging • Power Grid • Dependencies</div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (grid.backupPower.active) gridEngine.deactivateBackupPower()
              else gridEngine.activateBackupPower()
            }}
          >
            <Power className="h-4 w-4" />
            {grid.backupPower.active ? 'Backup ON' : 'Backup OFF'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className={shell}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className={textHard}>Event Load Engine</CardTitle>
                <div className={textSoft + ' mt-1 text-xs'}>Active campus events affecting load multipliers</div>
              </div>
              <div className={isLight ? 'rounded-xl border border-slate-900/10 bg-slate-900/5 p-2 text-slate-700' : 'rounded-xl border border-white/10 bg-white/5 p-2 text-white/70'}>
                <Calendar className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {activeEvents.length === 0 ? (
              <div className={isLight ? 'text-sm text-slate-600' : 'text-sm text-white/70'}>No active events right now.</div>
            ) : (
              <div className="space-y-2">
                {activeEvents.slice(0, 4).map((e) => (
                  <div key={e.id} className={isLight ? 'rounded-2xl border border-slate-900/10 bg-slate-900/5 p-3' : 'rounded-2xl border border-white/10 bg-slate-950/40 p-3'}>
                    <div className="flex items-center justify-between gap-2">
                      <div className={textHard + ' text-sm font-semibold'}>{e.name}</div>
                      <Badge tone={e.impact === 'critical' || e.impact === 'high' ? 'warning' : 'info'}>{e.impact}</Badge>
                    </div>
                    <div className={textSoft + ' mt-1 text-xs'}>
                      {formatDay(new Date(e.startDate))} → {formatDay(new Date(e.endDate))}
                    </div>
                    <div className={textSoft + ' mt-2 text-xs'}>
                      Multipliers: Occ {(e.loadMultipliers.occupancy * 100).toFixed(0)}% • Energy {(e.loadMultipliers.energy * 100).toFixed(0)}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={shell}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className={textHard}>Infrastructure Aging</CardTitle>
                <div className={textSoft + ' mt-1 text-xs'}>Degradation + efficiency loss derived from age & usage</div>
              </div>
              <div className={isLight ? 'rounded-xl border border-slate-900/10 bg-slate-900/5 p-2 text-slate-700' : 'rounded-xl border border-white/10 bg-white/5 p-2 text-white/70'}>
                <Wrench className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div className={isLight ? 'rounded-2xl border border-slate-900/10 bg-slate-900/5 p-4' : 'rounded-2xl border border-white/10 bg-slate-950/40 p-4'}>
                <div className={textSoft + ' text-xs font-semibold'}>Avg condition</div>
                <div className={textHard + ' mt-1 text-2xl font-semibold tabular-nums'}>{agingSummary.avgConditionPct}%</div>
              </div>
              <div className={isLight ? 'rounded-2xl border border-slate-900/10 bg-slate-900/5 p-4' : 'rounded-2xl border border-white/10 bg-slate-950/40 p-4'}>
                <div className={textSoft + ' text-xs font-semibold'}>Age ≥ 20y</div>
                <div className={textHard + ' mt-1 text-2xl font-semibold tabular-nums'}>{agingSummary.older}</div>
              </div>
              <div className={isLight ? 'rounded-2xl border border-slate-900/10 bg-slate-900/5 p-4' : 'rounded-2xl border border-white/10 bg-slate-950/40 p-4'}>
                <div className={textSoft + ' text-xs font-semibold'}>High loss</div>
                <div className={textHard + ' mt-1 text-2xl font-semibold tabular-nums'}>{agingSummary.highLoss}</div>
              </div>
            </div>

            <div className={textSoft + ' mt-3 text-xs'}>
              Tip: Run simulations often (stress/high occupancy) to justify higher maintenance frequency in your report.
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className={shell + ' xl:col-span-2'}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className={textHard}>Power Grid Monitor</CardTitle>
                <div className={textSoft + ' mt-1 text-xs'}>Transformer limits + campus utilization</div>
              </div>
              <div className={isLight ? 'rounded-xl border border-slate-900/10 bg-slate-900/5 p-2 text-slate-700' : 'rounded-xl border border-white/10 bg-white/5 p-2 text-white/70'}>
                <Cpu className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className={textSoft + ' text-xs font-semibold'}>Total load</div>
                <div className={textHard + ' mt-1 text-2xl font-semibold tabular-nums'}>{grid.totalLoad.toFixed(0)} kW</div>
              </div>
              <div className="text-right">
                <div className={textSoft + ' text-xs font-semibold'}>Capacity</div>
                <div className={textHard + ' mt-1 text-2xl font-semibold tabular-nums'}>{grid.totalCapacity.toFixed(0)} kW</div>
              </div>
              <div>
                <div className={textSoft + ' text-xs font-semibold'}>Utilization</div>
                <div className={textHard + ' mt-1'}>
                  <Badge tone={utilColor as any}>{grid.utilization.toFixed(1)}%</Badge>
                </div>
              </div>
            </div>

            {gridAlerts.length ? (
              <div className="mt-3 space-y-2">
                {gridAlerts.slice(0, 2).map((a, idx) => (
                  <div key={idx} className={isLight ? 'flex items-start gap-2 rounded-2xl border border-slate-900/10 bg-slate-900/5 p-3' : 'flex items-start gap-2 rounded-2xl border border-white/10 bg-slate-950/40 p-3'}>
                    <div className={isLight ? 'mt-0.5 rounded-xl border border-slate-900/10 bg-white/70 p-2 text-slate-700' : 'mt-0.5 rounded-xl border border-white/10 bg-white/5 p-2 text-white/70'}>
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className={textHard + ' text-sm font-semibold'}>{a.message}</div>
                      <div className={textSoft + ' mt-0.5 text-xs'}>{a.recommendedAction}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={textSoft + ' mt-3 text-xs'}>No grid alerts right now.</div>
            )}

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              {grid.transformers.map((t) => (
                <div key={t.id} className={isLight ? 'rounded-2xl border border-slate-900/10 bg-slate-900/5 p-4' : 'rounded-2xl border border-white/10 bg-slate-950/40 p-4'}>
                  <div className="flex items-center justify-between">
                    <div className={textHard + ' text-sm font-semibold'}>{t.id}</div>
                    <Badge tone={t.status === 'tripped' || t.status === 'overload' ? 'danger' : t.status === 'warning' ? 'warning' : 'success'}>
                      {t.status}
                    </Badge>
                  </div>
                  <div className={textSoft + ' mt-1 text-xs'}>{t.name}</div>
                  <div className={textSoft + ' mt-2 text-xs'}>
                    Load {t.currentLoad}/{t.capacity} kW • Temp {t.temperature}°C
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className={shell}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className={textHard}>Dependencies / Overflow</CardTitle>
                <div className={textSoft + ' mt-1 text-xs'}>Inter-building redistribution events</div>
              </div>
              <div className={isLight ? 'rounded-xl border border-slate-900/10 bg-slate-900/5 p-2 text-slate-700' : 'rounded-xl border border-white/10 bg-white/5 p-2 text-white/70'}>
                <GitPullRequestArrow className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {overflowHistory.length === 0 ? (
              <div className={isLight ? 'text-sm text-slate-600' : 'text-sm text-white/70'}>No overflow events yet.</div>
            ) : (
              <div className="space-y-2">
                {overflowHistory.slice(0, 6).map((e) => (
                  <div key={e.id} className={isLight ? 'rounded-2xl border border-slate-900/10 bg-slate-900/5 p-3' : 'rounded-2xl border border-white/10 bg-slate-950/40 p-3'}>
                    <div className={textHard + ' text-sm font-semibold'}>
                      {e.sourceBuildingName} → {e.targetBuildingName}
                    </div>
                    <div className={textSoft + ' mt-0.5 text-xs'}>
                      Redirected {e.studentsRedirected} students • {new Date(e.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className={textSoft + ' mt-4 text-xs'}>
              Dependencies are stored locally and used to generate overflow history during high occupancy.
            </div>
          </CardContent>
        </Card>
      </div>

      <div className={textSoft + ' flex items-center gap-2 text-xs'}>
        <Activity className="h-4 w-4" />
        Advanced Systems refresh every 5 seconds.
      </div>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Save, Zap } from 'lucide-react'
import Badge from '@/ui/Badge'
import Button from '@/ui/Button'
import Input from '@/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/Card'
import { useToast } from '@/ui/toast'
import { fetchBuildings } from '@/services/mockData'
import type { Building } from '@/types'
import { powerControlService } from '@/services/powerControlService'

type Row = {
  id: string
  name: string
  code: string
  type: string
  baseLoad: number
  loadMultiplier: number
  supplyLimitKw: number | ''
}

function safeNumber(v: unknown, fallback = 0) {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function capLabel(v: number | '') {
  if (v === '') return 'No cap'
  return `${v} kW cap`
}

export default function AdminPowerControl({ isLight }: { isLight?: boolean }) {
  const { push } = useToast()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Row[]>([])

  async function load() {
    setLoading(true)
    const buildings = await fetchBuildings()

    const next: Row[] = buildings.map((b: Building) => {
      const control = powerControlService.get(b.id)
      return {
        id: b.id,
        name: b.buildingName,
        code: b.buildingCode,
        type: b.buildingType,
        baseLoad: safeNumber(b.baseEnergyLoad, 0),
        loadMultiplier: safeNumber(control.loadMultiplier, 1),
        supplyLimitKw: control.supplyLimitKw == null ? '' : safeNumber(control.supplyLimitKw, 0),
      }
    })

    setRows(next)
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const activeCount = useMemo(() => {
    return rows.filter((r) => r.loadMultiplier !== 1 || r.supplyLimitKw !== '').length
  }, [rows])

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function saveAll() {
    try {
      for (const r of rows) {
        powerControlService.set({
          buildingId: r.id,
          loadMultiplier: r.loadMultiplier,
          supplyLimitKw: r.supplyLimitKw === '' ? null : r.supplyLimitKw,
        })
      }
      push({ tone: 'success', title: 'Power controls saved', message: 'Grid will reflect changes within a few seconds.' })
    } catch (e) {
      push({ tone: 'error', title: 'Save failed', message: e instanceof Error ? e.message : 'Failed to save' })
    }
  }

  function resetAll() {
    if (!confirm('Reset all building power controls to defaults?')) return
    powerControlService.resetAll()
    void load()
    push({ tone: 'success', title: 'Reset completed' })
  }

  return (
    <div className="space-y-6">
      <Card className={isLight ? 'border border-slate-900/10 bg-white' : undefined}>
        <CardHeader className={isLight ? 'border-slate-900/10' : undefined}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className={isLight ? 'text-slate-900' : undefined}>Admin Power Control</CardTitle>
              <div className={isLight ? 'mt-1 text-xs text-slate-600' : 'mt-1 text-xs text-white/60'}>
                Increase / decrease building load and optionally cap electricity supply per building
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={activeCount ? 'warning' : 'success'}>{activeCount ? `${activeCount} active` : 'default'}</Badge>
              <Button variant="outline" onClick={() => void load()} disabled={loading}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button variant="outline" onClick={resetAll}>
                Reset All
              </Button>
              <Button onClick={saveAll}>
                <Save className="h-4 w-4" />
                Save
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className={isLight ? 'text-sm text-slate-700' : 'text-sm text-white/70'}>Loading…</div>
          ) : (
            <div className={isLight ? 'overflow-x-auto' : 'overflow-x-auto'}>
              <table className={isLight ? 'w-full min-w-[980px] text-left text-sm text-slate-800' : 'w-full min-w-[980px] text-left text-sm text-white/80'}>
                <thead className={isLight ? 'text-xs font-semibold text-slate-600' : 'text-xs font-semibold text-white/60'}>
                  <tr className={isLight ? 'border-b border-slate-900/10' : 'border-b border-white/10'}>
                    <th className="py-3 pr-4">Building</th>
                    <th className="py-3 pr-4">Type</th>
                    <th className="py-3 pr-4">Base Load</th>
                    <th className="py-3 pr-4">Load Multiplier</th>
                    <th className="py-3 pr-4">Supply Cap (kW)</th>
                    <th className="py-3 pr-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const active = r.loadMultiplier !== 1 || r.supplyLimitKw !== ''
                    const tone = active ? 'warning' : 'success'
                    return (
                      <tr key={r.id} className={isLight ? 'border-b border-slate-900/10' : 'border-b border-white/10'}>
                        <td className="py-3 pr-4">
                          <div className="font-semibold">{r.name}</div>
                          <div className={isLight ? 'text-xs text-slate-600' : 'text-xs text-white/60'}>{r.code}</div>
                        </td>
                        <td className="py-3 pr-4">{r.type}</td>
                        <td className="py-3 pr-4">{Math.round(r.baseLoad)} kW</td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min={0.5}
                              max={2}
                              step={0.05}
                              value={r.loadMultiplier}
                              onChange={(e) => updateRow(r.id, { loadMultiplier: Number(e.target.value) })}
                              className="w-48"
                            />
                            <div className={isLight ? 'w-16 text-sm font-semibold text-slate-800 tabular-nums' : 'w-16 text-sm font-semibold text-white tabular-nums'}>
                              {r.loadMultiplier.toFixed(2)}x
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="max-w-[220px]">
                            <Input
                              type="number"
                              value={r.supplyLimitKw}
                              min={0}
                              placeholder="No cap"
                              onChange={(e) => {
                                const v = e.target.value
                                updateRow(r.id, { supplyLimitKw: v === '' ? '' : Number(v) })
                              }}
                              className={isLight ? 'border-slate-900/10 bg-white text-slate-900 placeholder:text-slate-400 focus:border-brand-500/60' : undefined}
                            />
                            <div className={isLight ? 'mt-1 text-xs text-slate-600' : 'mt-1 text-xs text-white/50'}>{capLabel(r.supplyLimitKw)}</div>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <Zap className={isLight ? 'h-4 w-4 text-slate-500' : 'h-4 w-4 text-white/50'} />
                            <Badge tone={tone as any}>{active ? 'OVERRIDE' : 'DEFAULT'}</Badge>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className={isLight ? 'mt-4 text-xs text-slate-600' : 'mt-4 text-xs text-white/50'}>
            Notes: Load Multiplier scales the building base load. Supply Cap limits max kW delivered to that building.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

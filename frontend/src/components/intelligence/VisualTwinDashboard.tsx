import { useEffect, useMemo, useState } from 'react'
import { Building2, ShieldAlert } from 'lucide-react'
import Badge from '@/ui/Badge'
import Button from '@/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/Card'
import { fetchBuildings } from '@/services/mockData'
import { fetchAllBuildingMetrics } from '@/services/api/metricsService'
import { agingEngine } from '@/services/agingEngine'
import { gridEngine } from '@/services/gridEngine'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function riskTone(score: number): 'success' | 'warning' | 'danger' | 'info' {
  if (score >= 80) return 'danger'
  if (score >= 60) return 'warning'
  if (score >= 40) return 'info'
  return 'success'
}

export default function VisualTwinDashboard({ isLight }: { isLight?: boolean }) {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<any[]>([])

  async function load() {
    setLoading(true)
    try {
      const [buildings, metrics] = await Promise.all([fetchBuildings(), fetchAllBuildingMetrics()])
      buildings.forEach((b) => agingEngine.initializeBuilding(b as any))

      const grid = gridEngine.getGrid()

      const enriched = buildings.map((b: any) => {
        const m = metrics.find((x) => x.buildingId === b.id)
        const aging = agingEngine.getAgingData(b.id)

        const occ = Number(b.occupancyRate ?? 0)
        const energy = Number(b.baseEnergyLoad ?? 0)
        const health = Number(m?.healthScore ?? 0)
        const deg = aging ? Number(aging.degradationFactor ?? 1) : 1

        const occRisk = clamp((occ - 60) * 1.1, 0, 50)
        const energyRisk = clamp(energy / 6, 0, 40)
        const healthRisk = clamp(70 - health, 0, 70)
        const agingRisk = clamp((1 - deg) * 120, 0, 60)
        const gridRisk = clamp((Number(grid.utilization ?? 0) - 65) * 0.7, 0, 30)

        const risk = clamp(Math.round(occRisk + energyRisk + healthRisk + agingRisk + gridRisk), 0, 100)

        return {
          id: b.id,
          name: b.buildingName,
          code: b.buildingCode,
          type: b.buildingType,
          occupancyRate: occ,
          baseEnergyLoad: energy,
          healthScore: health,
          degradationPct: Math.round(deg * 100),
          risk,
        }
      })

      setItems(enriched)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    const unsub = gridEngine.subscribe(() => {
      void load()
    })
    return unsub
  }, [])

  const worst = useMemo(() => [...items].sort((a, b) => b.risk - a.risk).slice(0, 3), [items])

  const shell = isLight ? 'border-slate-900/10 bg-white/95' : 'border-white/10 bg-white/5'
  const textHard = isLight ? 'text-slate-900' : 'text-white'
  const textSoft = isLight ? 'text-slate-600' : 'text-white/60'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={isLight ? 'grid h-11 w-11 place-items-center rounded-2xl border border-slate-900/10 bg-slate-900/5 text-slate-700' : 'grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/5 text-white/70'}>
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className={textHard + ' text-base font-semibold'}>Visual Twin</div>
            <div className={textSoft + ' text-sm'}>Digital twin heatmap of building risk in real time</div>
          </div>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          Refresh
        </Button>
      </div>

      <Card className={shell}>
        <CardHeader>
          <CardTitle className={textHard}>Top risk buildings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {worst.map((w) => (
              <div key={w.id} className={isLight ? 'rounded-2xl border border-slate-900/10 bg-slate-900/5 p-4' : 'rounded-2xl border border-white/10 bg-slate-950/40 p-4'}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className={textHard + ' truncate text-sm font-semibold'}>{w.name}</div>
                    <div className={textSoft + ' mt-1 text-xs'}>{w.code}</div>
                  </div>
                  <Badge tone={riskTone(w.risk)}>{w.risk}/100</Badge>
                </div>
                <div className={textSoft + ' mt-3 text-xs'}>
                  Occ {w.occupancyRate}% • Energy {w.baseEnergyLoad}kW • Health {w.healthScore}% • Age {w.degradationPct}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((b) => (
          <div key={b.id} className={shell + ' rounded-3xl border p-4'}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className={textHard + ' truncate text-sm font-semibold'}>{b.name}</div>
                <div className={textSoft + ' mt-1 text-xs'}>{b.code} • {b.type}</div>
              </div>
              <Badge tone={riskTone(b.risk)}>{b.risk}</Badge>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className={textSoft}>Occupancy: <span className={textHard}>{b.occupancyRate}%</span></div>
              <div className={textSoft}>Energy: <span className={textHard}>{b.baseEnergyLoad} kW</span></div>
              <div className={textSoft}>Health: <span className={textHard}>{b.healthScore}%</span></div>
              <div className={textSoft}>Condition: <span className={textHard}>{b.degradationPct}%</span></div>
            </div>
          </div>
        ))}
      </div>

      <div className={textSoft + ' flex items-center gap-2 text-xs'}>
        <ShieldAlert className="h-4 w-4" />
        Risk combines occupancy, energy, health score, aging degradation, and grid utilization.
      </div>
    </div>
  )
}

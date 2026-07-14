import { useEffect, useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Clock, RefreshCw } from 'lucide-react'
import Button from '@/ui/Button'
import Badge from '@/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/Card'
import { fetchBuildings } from '@/services/mockData'
import { eventEngine } from '@/services/eventEngine'
import { timeEngine, TIME_SLOT_CONFIGS, CAMPUS_MODE_CONFIGS } from '@/services/timeEngine'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function slotForHour(h: number) {
  if (h >= 8 && h < 12) return 'morning'
  if (h >= 12 && h < 17) return 'afternoon'
  if (h >= 17 && h < 21) return 'evening'
  return 'night'
}

function dayTypeFactor(dayType: string) {
  if (dayType === 'weekend') return 0.3
  if (dayType === 'holiday') return 0.45
  return 1
}

function multipliersForHour(args: { hour: number; dayType: string; mode: keyof typeof CAMPUS_MODE_CONFIGS; eventMult: { occupancy: number; energy: number } }) {
  const slot = slotForHour(args.hour)
  const slotCfg = TIME_SLOT_CONFIGS.find((s) => s.slot === slot) ?? TIME_SLOT_CONFIGS[0]
  const modeCfg = CAMPUS_MODE_CONFIGS[args.mode]
  const weekend = dayTypeFactor(args.dayType)

  const occupancyMultiplier = (slotCfg.defaultOccupancy / 100) * modeCfg.occupancyAdjustment * weekend * args.eventMult.occupancy
  const energyMultiplier = slotCfg.energyFactor * modeCfg.energyAdjustment * weekend * args.eventMult.energy

  return { slot, occupancyMultiplier, energyMultiplier }
}

export default function ForecastDashboard({ isLight }: { isLight?: boolean }) {
  const [loading, setLoading] = useState(true)
  const [series, setSeries] = useState<Array<{ hour: string; occupancy: number; energy: number }>>([])

  async function compute() {
    setLoading(true)
    try {
      const buildings = await fetchBuildings()
      const vt = timeEngine.getVirtualTime()
      const now = new Date(vt.currentDate)
      const activeEvents = eventEngine.getActiveEvents(now)
      const globalEvent = eventEngine.getGlobalLoadMultipliers(now)

      const res: Array<{ hour: string; occupancy: number; energy: number }> = []
      for (let i = 0; i < 24; i++) {
        const h = i
        const mult = multipliersForHour({
          hour: h,
          dayType: vt.dayType,
          mode: vt.campusMode,
          eventMult: { occupancy: globalEvent.occupancy, energy: globalEvent.energy },
        })

        const cap = buildings.reduce((a, b: any) => a + Number(b.totalRooms ?? 0) * 40, 0)
        const baseOccRate = buildings.length
          ? buildings.reduce((a, b: any) => a + Number(b.occupancyRate ?? 0), 0) / buildings.length
          : 0

        const occStudents = Math.round(((cap * baseOccRate) / 100) * mult.occupancyMultiplier)
        const occRate = cap > 0 ? clamp((occStudents / cap) * 100, 0, 100) : 0

        const baseEnergy = buildings.reduce((a, b: any) => a + Number(b.baseEnergyLoad ?? 0), 0)
        const energy = Math.max(0, baseEnergy * mult.energyMultiplier)

        res.push({ hour: `${h}:00`, occupancy: Math.round(occRate), energy: Math.round(energy) })
      }

      setSeries(res)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void compute()
    const unsub = timeEngine.subscribe(() => {
      void compute()
    })
    const timer = setInterval(() => {
      void compute()
    }, 120000)
    return () => {
      unsub()
      clearInterval(timer)
    }
  }, [])

  const headerTone = isLight ? 'border-slate-900/10 bg-white/95' : 'border-white/10 bg-white/5'
  const grid = isLight ? 'rgba(15,23,42,0.10)' : 'rgba(255,255,255,0.10)'
  const tick = isLight ? 'rgba(15,23,42,0.70)' : 'rgba(255,255,255,0.70)'

  const peaks = useMemo(() => {
    if (!series.length) return { occ: 0, energy: 0 }
    return {
      occ: Math.max(...series.map((x) => x.occupancy)),
      energy: Math.max(...series.map((x) => x.energy)),
    }
  }, [series])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className={isLight ? 'grid h-11 w-11 place-items-center rounded-2xl border border-slate-900/10 bg-slate-900/5 text-slate-700' : 'grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/5 text-white/70'}>
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className={isLight ? 'text-base font-semibold text-slate-900' : 'text-base font-semibold text-white'}>24h Forecast</div>
            <div className={isLight ? 'text-sm text-slate-600' : 'text-sm text-white/60'}>Time-aware + event-aware campus load prediction</div>
          </div>
        </div>
        <Button variant="outline" onClick={compute} disabled={loading}>
          <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className={headerTone}>
          <CardHeader>
            <CardTitle className={isLight ? 'text-slate-900' : ''}>Peak occupancy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={isLight ? 'text-3xl font-semibold text-slate-900 tabular-nums' : 'text-3xl font-semibold text-white tabular-nums'}>{peaks.occ}%</div>
            <div className={isLight ? 'mt-1 text-sm text-slate-600' : 'mt-1 text-sm text-white/60'}>Max predicted utilization</div>
          </CardContent>
        </Card>
        <Card className={headerTone}>
          <CardHeader>
            <CardTitle className={isLight ? 'text-slate-900' : ''}>Peak energy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={isLight ? 'text-3xl font-semibold text-slate-900 tabular-nums' : 'text-3xl font-semibold text-white tabular-nums'}>{peaks.energy} kW</div>
            <div className={isLight ? 'mt-1 text-sm text-slate-600' : 'mt-1 text-sm text-white/60'}>Max predicted demand</div>
          </CardContent>
        </Card>
        <Card className={headerTone}>
          <CardHeader>
            <CardTitle className={isLight ? 'text-slate-900' : ''}>Model</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={isLight ? 'text-sm text-slate-700' : 'text-sm text-white/70'}>
              <div>
                <Badge tone="info">Virtual time</Badge>
              </div>
              <div className={isLight ? 'mt-2 text-xs text-slate-600' : 'mt-2 text-xs text-white/60'}>
                Uses time slots + campus mode + active event multipliers.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={headerTone}>
        <CardHeader>
          <CardTitle className={isLight ? 'text-slate-900' : ''}>Forecast curve</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid stroke={grid} vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 12, fill: tick }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: tick }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: isLight ? 'rgba(255,255,255,0.98)' : 'rgba(2,6,23,0.92)',
                    border: isLight ? '1px solid rgba(15,23,42,0.16)' : '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 12,
                    color: isLight ? 'rgb(15,23,42)' : 'rgba(255,255,255,0.92)',
                  }}
                />
                <Line type="monotone" dataKey="occupancy" stroke={isLight ? '#2563eb' : '#60a5fa'} strokeWidth={2} dot={false} name="Occupancy %" />
                <Line type="monotone" dataKey="energy" stroke={isLight ? '#f59e0b' : '#fbbf24'} strokeWidth={2} dot={false} name="Energy kW" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

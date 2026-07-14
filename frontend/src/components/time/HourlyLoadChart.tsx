import { useEffect, useMemo, useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/Card'
import { CAMPUS_MODE_CONFIGS } from '@/services/timeEngine'
import { timeEngine } from '@/services/timeEngine'

type LoadPoint = {
  hour: string
  occupancy: number
  energy: number
  timeSlot: string
}

function slotForHour(hour: number) {
  if (hour >= 8 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

function baseMultipliersForSlot(slot: string) {
  const map: Record<string, { occupancy: number; energy: number }> = {
    morning: { occupancy: 0.85, energy: 1.2 },
    afternoon: { occupancy: 0.7, energy: 1.0 },
    evening: { occupancy: 0.4, energy: 0.7 },
    night: { occupancy: 0.1, energy: 0.3 },
  }
  return map[slot] ?? { occupancy: 0.5, energy: 0.5 }
}

export default function HourlyLoadChart({ isLight }: { isLight?: boolean }) {
  const [mode, setMode] = useState(() => timeEngine.getVirtualTime().campusMode)

  useEffect(() => {
    const unsub = timeEngine.subscribe((t) => setMode(t.campusMode))
    return unsub
  }, [])

  const modeConfig = CAMPUS_MODE_CONFIGS[mode]

  const data = useMemo<LoadPoint[]>(() => {
    const points: LoadPoint[] = []
    const weekendFactor = timeEngine.getVirtualTime().dayType === 'weekend' ? 0.3 : 1.0

    for (let hour = 0; hour < 24; hour++) {
      const slot = slotForHour(hour)
      const base = baseMultipliersForSlot(slot)
      points.push({
        hour: `${String(hour).padStart(2, '0')}:00`,
        occupancy: Math.round(base.occupancy * modeConfig.occupancyAdjustment * weekendFactor * 100),
        energy: Math.round(base.energy * modeConfig.energyAdjustment * weekendFactor * 100),
        timeSlot: slot,
      })
    }

    return points
  }, [mode, modeConfig.energyAdjustment, modeConfig.occupancyAdjustment])

  const grid = isLight ? 'rgba(15,23,42,0.10)' : 'rgba(255,255,255,0.10)'
  const tick = isLight ? 'rgba(15,23,42,0.70)' : 'rgba(255,255,255,0.70)'

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>24-Hour Load Profile</CardTitle>
            <div className="mt-1 text-xs text-white/60">Projected occupancy vs energy load (time-aware)</div>
          </div>
          <div className="text-xs text-white/60">Mode: {modeConfig.mode}</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid stroke={grid} vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 12, fill: tick }} axisLine={false} tickLine={false} interval={2} />
              <YAxis tick={{ fontSize: 12, fill: tick }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: isLight ? 'rgba(255,255,255,0.98)' : 'rgba(2,6,23,0.92)',
                  border: isLight ? '1px solid rgba(15,23,42,0.16)' : '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 12,
                  color: isLight ? 'rgb(15,23,42)' : 'rgba(255,255,255,0.92)',
                  boxShadow: isLight ? '0 16px 40px rgba(2,6,23,0.12)' : '0 16px 40px rgba(0,0,0,0.35)',
                }}
                labelStyle={{ color: tick }}
                itemStyle={{ color: isLight ? 'rgb(15,23,42)' : 'rgba(255,255,255,0.92)' }}
              />
              <Legend wrapperStyle={{ color: tick }} />
              <Line type="monotone" dataKey="occupancy" name="Occupancy (%)" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="energy" name="Energy Load (%)" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

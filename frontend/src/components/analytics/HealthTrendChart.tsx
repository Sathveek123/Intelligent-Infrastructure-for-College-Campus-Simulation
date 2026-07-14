import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import ErrorState from '@/ui/ErrorState'
import LoadingSkeleton from '@/ui/LoadingSkeleton'
import type { HealthAnomaly, HealthSnapshot, HealthTrend } from '@/types'
import { fetchHealthTrend } from '@/services/api/analyticsService'

type Props = {
  buildingId: string
  initialDays?: 7 | 14 | 30 | 90
}

type TrendResponse = {
  buildingId: string
  buildingName: string
  currentScore: number
  snapshots: HealthSnapshot[]
  trend: HealthTrend
  anomalies: HealthAnomaly[]
}

function zoneColor(score: number): string {
  if (score >= 80) return '#10b981'
  if (score >= 60) return '#f59e0b'
  return '#ef4444'
}

export function HealthTrendChart({ buildingId, initialDays = 7 }: Props) {
  const [days, setDays] = useState<7 | 14 | 30 | 90>(initialDays)
  const [showComponents, setShowComponents] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<TrendResponse | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetchHealthTrend(buildingId, days)
        setData(res)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [buildingId, days])

  const chartData = useMemo(() => {
    if (!data) return []

    const anomaliesByDate = new Map(data.anomalies.map((a) => [a.date, a]))

    return data.snapshots.map((s) => ({
      date: s.date.slice(5),
      fullDate: s.date,
      healthScore: s.healthScore,
      occupancy: s.components.occupancyEfficiency,
      energy: s.components.energyEfficiency,
      maintenance: s.components.maintenanceHealth,
      pointColor: zoneColor(s.healthScore),
      anomaly: anomaliesByDate.get(s.date) ?? null,
    }))
  }, [data])

  if (loading) return <LoadingSkeleton variant="chart" count={1} />
  if (error) return <ErrorState title="Failed to load health trends" message={error} />
  if (!data) return null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">{data.buildingName} - Health Trend</div>
          <div className="text-sm text-white/60">Current: {Math.round(data.currentScore)}% • {data.trend.direction}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-10 rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/20"
            value={days}
            onChange={(e) => setDays(Number(e.target.value) as 7 | 14 | 30 | 90)}
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            type="button"
            className={
              showComponents
                ? 'h-10 rounded-xl border border-brand-500/30 bg-brand-500/15 px-3 text-sm font-semibold text-white'
                : 'h-10 rounded-xl border border-white/15 bg-white/5 px-3 text-sm font-semibold text-white/80 hover:bg-white/10'
            }
            onClick={() => setShowComponents((v) => !v)}
          >
            {showComponents ? 'Hide components' : 'Show components'}
          </button>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const p = payload[0].payload as any
                return (
                  <div className="rounded-2xl border border-white/15 bg-slate-950/70 p-3 text-sm text-white shadow-lg backdrop-blur">
                    <div className="font-semibold text-white">{p.fullDate}</div>
                    <div className="mt-1 text-white/80">Health: {Math.round(p.healthScore)}%</div>
                    {p.anomaly ? (
                      <div className="mt-2 rounded-xl border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-200">
                        {p.anomaly.description}
                      </div>
                    ) : null}
                  </div>
                )
              }}
            />
            <Legend />

            {/* Color zones */}
            <ReferenceArea y1={0} y2={60} fill="#fee2e2" fillOpacity={0.6} />
            <ReferenceArea y1={60} y2={80} fill="#fef3c7" fillOpacity={0.6} />
            <ReferenceArea y1={80} y2={100} fill="#d1fae5" fillOpacity={0.6} />

            <Area type="monotone" dataKey="healthScore" stroke="#2563eb" fill="#2563eb" fillOpacity={0.08} />
            <Line
              type="monotone"
              dataKey="healthScore"
              name="Health Score"
              stroke="#2563eb"
              strokeWidth={2}
              dot={(props: any) => {
                const { cx, cy, payload } = props
                const hasAnomaly = Boolean(payload?.anomaly)
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={hasAnomaly ? 5 : 3}
                    fill={payload?.pointColor || '#2563eb'}
                    stroke={hasAnomaly ? '#111827' : 'none'}
                    strokeWidth={hasAnomaly ? 1 : 0}
                  />
                )
              }}
            />

            {showComponents ? (
              <>
                <Line type="monotone" dataKey="occupancy" name="Occupancy" stroke="#10b981" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="energy" name="Energy" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="maintenance" name="Maintenance" stroke="#ef4444" strokeWidth={1.5} dot={false} />
              </>
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div className="text-xs font-semibold text-white/60">Avg change/day</div>
          <div className="mt-2 text-2xl font-semibold text-white">{data.trend.averageChange}</div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div className="text-xs font-semibold text-white/60">Moving avg (7d)</div>
          <div className="mt-2 text-2xl font-semibold text-white">{Math.round(data.trend.movingAverage7Day)}%</div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div className="text-xs font-semibold text-white/60">Moving avg (30d)</div>
          <div className="mt-2 text-2xl font-semibold text-white">{Math.round(data.trend.movingAverage30Day)}%</div>
        </div>
      </div>
    </div>
  )
}

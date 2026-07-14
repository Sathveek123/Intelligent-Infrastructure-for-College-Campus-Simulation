import { useEffect, useMemo, useState } from 'react'
import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react'
import { Line, LineChart, ResponsiveContainer } from 'recharts'
import ErrorState from '@/ui/ErrorState'
import LoadingSkeleton from '@/ui/LoadingSkeleton'
import type { BuildingHealthOverview } from '@/types'
import { fetchHealthOverview } from '@/services/api/analyticsService'
import HealthBadge from '@/ui/HealthBadge'

type Props = {
  days?: 7 | 14 | 30 | 90
  onSelectBuilding?: (buildingId: string) => void
}

function trendIcon(t: BuildingHealthOverview['trend']) {
  if (t === 'improving') return ArrowUpRight
  if (t === 'declining') return ArrowDownRight
  return ArrowRight
}

function trendColor(t: BuildingHealthOverview['trend']) {
  if (t === 'improving') return 'text-emerald-300'
  if (t === 'declining') return 'text-red-300'
  return 'text-white/70'
}

export function HealthOverviewGrid({ days = 7, onSelectBuilding }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<BuildingHealthOverview[]>([])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetchHealthOverview(days)
        setData(res)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [days])

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => b.currentScore - a.currentScore)
  }, [data])

  if (loading) return <LoadingSkeleton variant="card" count={3} />
  if (error) return <ErrorState title="Failed to load health overview" message={error} />

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {sorted.map((b) => {
        const Icon = trendIcon(b.trend)
        const spark = [{ v: Math.max(0, b.currentScore - b.scoreChange7Day) }, { v: b.currentScore }]

        return (
          <div
            key={b.buildingId}
            className="cursor-pointer rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur transition-shadow hover:bg-white/10"
            onClick={() => onSelectBuilding?.(b.buildingId)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-semibold text-white">{b.buildingName}</div>
                <div className={`mt-1 inline-flex items-center gap-1 text-sm font-semibold ${trendColor(b.trend)}`}>
                  <Icon className="h-4 w-4" />
                  <span>{b.trend}</span>
                  <span className="text-white/40">•</span>
                  <span>{b.scoreChange7Day >= 0 ? `+${b.scoreChange7Day}` : b.scoreChange7Day} (7d)</span>
                </div>
              </div>
              <HealthBadge status={b.currentStatus} score={b.currentScore} size="sm" />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-white/60">Current score</div>
                <div className="mt-1 text-2xl font-semibold text-white">{Math.round(b.currentScore)}%</div>
              </div>
              <div className="h-10 w-24">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={spark}>
                    <Line type="monotone" dataKey="v" stroke="#2563eb" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

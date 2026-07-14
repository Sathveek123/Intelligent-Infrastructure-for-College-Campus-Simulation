import { useEffect, useMemo, useState } from 'react'
import { Lightbulb, RefreshCw, Trash2 } from 'lucide-react'
import RecommendationCard from '@/components/recommendations/RecommendationCard'
import { recommendationEngine } from '@/services/recommendationEngine'
import type { Recommendation, SimulationContext } from '@/types/recommendationModel'
import Button from '@/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/Card'
import Badge from '@/ui/Badge'
import { useToast } from '@/ui/toast'
import { fetchAllBuildingMetrics } from '@/services/api/metricsService'
import { fetchBuildings, fetchMaintenance } from '@/services/mockData'
import { fetchActivePredictions } from '@/services/api/predictiveMaintenanceService'
import { fetchAllSimulationRunDetails } from '@/services/api/simulationService'
import { gridEngine } from '@/services/gridEngine'
import { eventEngine } from '@/services/eventEngine'
import { agingEngine } from '@/services/agingEngine'

type Filter = 'pending' | 'accepted' | 'dismissed' | 'implemented' | 'all'

function toCampusContext(args: {
  buildings: any[]
  metrics: any[]
  predictions: any[]
  maintenance: any[]
  simulations: any[]
}) {
  const now = new Date()

  const events = eventEngine.getActiveEvents(now)
  const grid = gridEngine.getGrid()

  const buildingsWithSignals = args.buildings.map((b: any) => {
    const cap = Number(b.totalRooms ?? 0) * 40
    const occRate = Number(b.occupancyRate ?? 0)
    const currentOccupancy = Math.round((cap * occRate) / 100)
    return {
      ...b,
      totalCapacity: cap,
      currentOccupancy,
      currentEnergyLoad: Number(b.baseEnergyLoad ?? 0),
    }
  })

  const agingData = buildingsWithSignals.map((b: any) => agingEngine.getAgingData(b.id)).filter(Boolean)

  const ctx: SimulationContext = {
    buildings: buildingsWithSignals,
    simulations: args.simulations,
    healthScores: args.metrics,
    gridStatus: grid,
    events,
    agingData,
    maintenanceRecords: [...args.maintenance, ...args.predictions],
    occupancyRecords: [],
  }

  return ctx
}

export default function RecommendationsDashboard({ isLight }: { isLight?: boolean }) {
  const { push } = useToast()
  const [filter, setFilter] = useState<Filter>('pending')
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    const unsub = recommendationEngine.subscribe((pending) => {
      if (filter === 'pending') setRecommendations(pending)
    })
    return unsub
  }, [filter])

  useEffect(() => {
    if (filter === 'pending') {
      setRecommendations(recommendationEngine.getPendingRecommendations())
      return
    }
    const all = recommendationEngine.getAllRecommendations()
    if (filter === 'all') setRecommendations(all)
    else setRecommendations(all.filter((r) => r.status === filter))
  }, [filter])

  const counts = useMemo(() => {
    const all = recommendationEngine.getAllRecommendations()
    const pending = all.filter((r) => r.status === 'pending')
    const accepted = all.filter((r) => r.status === 'accepted')
    const dismissed = all.filter((r) => r.status === 'dismissed')
    const implemented = all.filter((r) => r.status === 'implemented')
    const critical = pending.filter((r) => r.severity === 'critical')
    return { pending: pending.length, accepted: accepted.length, dismissed: dismissed.length, implemented: implemented.length, critical: critical.length }
  }, [recommendations.length])

  async function handleGenerate() {
    setGenerating(true)
    try {
      const [buildings, metrics, predictions, maintenance, simulations] = await Promise.all([
        fetchBuildings(),
        fetchAllBuildingMetrics(),
        fetchActivePredictions(),
        fetchMaintenance(),
        fetchAllSimulationRunDetails(),
      ])

      const ctx = toCampusContext({ buildings, metrics, predictions, maintenance, simulations })
      const newRecs = recommendationEngine.analyzeAndGenerate(ctx)

      push({
        tone: 'success',
        title: newRecs.length ? `Generated ${newRecs.length} recommendation${newRecs.length > 1 ? 's' : ''}` : 'No new recommendations',
      })

      if (filter === 'pending') setRecommendations(recommendationEngine.getPendingRecommendations())
      else setRecommendations(recommendationEngine.getAllRecommendations())
    } catch (e) {
      push({ tone: 'error', title: 'Generation failed', message: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      setGenerating(false)
    }
  }

  const headerBg = isLight ? 'border-slate-900/10 bg-white/95' : 'border-white/10 bg-white/5'
  const textHard = isLight ? 'text-slate-900' : 'text-white'
  const textSoft = isLight ? 'text-slate-600' : 'text-white/60'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={isLight ? 'grid h-11 w-11 place-items-center rounded-2xl border border-slate-900/10 bg-slate-900/5 text-slate-700' : 'grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/5 text-white/70'}>
            <Lightbulb className="h-5 w-5" />
          </div>
          <div>
            <div className={textHard + ' text-base font-semibold'}>AI Recommendations</div>
            <div className={textSoft + ' text-sm'}>Actionable decisions derived from simulation + campus state</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleGenerate} disabled={generating}>
            <RefreshCw className={generating ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            Generate
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              recommendationEngine.clearAll()
              setRecommendations([])
              push({ tone: 'info', title: 'Cleared recommendations' })
            }}
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className={headerBg}>
          <CardHeader>
            <CardTitle className={textHard}>Pending</CardTitle>
          </CardHeader>
          <CardContent className={textSoft}>
            <div className={textHard + ' text-3xl font-semibold tabular-nums'}>{counts.pending}</div>
          </CardContent>
        </Card>
        <Card className={headerBg}>
          <CardHeader>
            <CardTitle className={textHard}>Critical</CardTitle>
          </CardHeader>
          <CardContent className={textSoft}>
            <div className={textHard + ' text-3xl font-semibold tabular-nums'}>{counts.critical}</div>
          </CardContent>
        </Card>
        <Card className={headerBg}>
          <CardHeader>
            <CardTitle className={textHard}>Accepted</CardTitle>
          </CardHeader>
          <CardContent className={textSoft}>
            <div className={textHard + ' text-3xl font-semibold tabular-nums'}>{counts.accepted}</div>
          </CardContent>
        </Card>
        <Card className={headerBg}>
          <CardHeader>
            <CardTitle className={textHard}>Implemented</CardTitle>
          </CardHeader>
          <CardContent className={textSoft}>
            <div className={textHard + ' text-3xl font-semibold tabular-nums'}>{counts.implemented}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
        {(['pending', 'accepted', 'dismissed', 'implemented', 'all'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={
              filter === k
                ? isLight
                  ? 'rounded-xl border border-slate-900/10 bg-slate-900/5 px-3 py-1.5 text-sm font-semibold text-slate-900'
                  : 'rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white'
                : isLight
                  ? 'rounded-xl px-3 py-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900'
                  : 'rounded-xl px-3 py-1.5 text-sm font-semibold text-white/60 hover:text-white'
            }
          >
            {k}
            {k === 'pending' && counts.pending ? <span className="ml-1">({counts.pending})</span> : null}
          </button>
        ))}
      </div>

      {recommendations.length ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {recommendations.map((r) => (
            <RecommendationCard
              key={r.id}
              recommendation={r}
              onAccept={(id) => {
                recommendationEngine.acceptRecommendation(id)
                push({ tone: 'success', title: 'Accepted' })
                if (filter === 'pending') setRecommendations(recommendationEngine.getPendingRecommendations())
              }}
              onImplement={(id) => {
                recommendationEngine.markImplemented(id)
                push({ tone: 'success', title: 'Marked implemented' })
                if (filter === 'pending') setRecommendations(recommendationEngine.getPendingRecommendations())
              }}
              onDismiss={(id, reason) => {
                recommendationEngine.dismissRecommendation(id, reason)
                push({ tone: 'info', title: 'Dismissed', message: reason })
                if (filter === 'pending') setRecommendations(recommendationEngine.getPendingRecommendations())
              }}
            />
          ))}
        </div>
      ) : (
        <Card className={headerBg}>
          <CardContent>
            <div className={textHard + ' text-sm font-semibold'}>No recommendations</div>
            <div className={textSoft + ' mt-1 text-sm'}>Click Generate to analyze the current campus state.</div>
            <div className="mt-3">
              <Button variant="outline" onClick={handleGenerate} disabled={generating}>
                <RefreshCw className={generating ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
                Generate
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-xs text-white/50">
        <Badge tone="neutral">Offline</Badge> Stored locally in <span className="font-mono">{STORAGE_KEY}</span>
      </div>
    </div>
  )
}

const STORAGE_KEY = 'i2sf_recommendations_v1'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/Card'
import Badge from '@/ui/Badge'
import { iriEngine, type IRIComponents } from '@/services/iriEngine'

function statusTone(status: IRIComponents['status']) {
  if (status === 'safe') return 'success'
  if (status === 'caution') return 'warning'
  if (status === 'warning') return 'warning'
  return 'danger'
}

function statusLabel(status: IRIComponents['status']) {
  if (status === 'safe') return 'SAFE'
  if (status === 'caution') return 'CAUTION'
  if (status === 'warning') return 'WARNING'
  return 'CRITICAL'
}

function trendIcon(trend: IRIComponents['trend']) {
  if (trend === 'improving') return <TrendingDown className="h-4 w-4 text-emerald-300" />
  if (trend === 'degrading') return <TrendingUp className="h-4 w-4 text-red-300" />
  return <Minus className="h-4 w-4 text-white/70" />
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export default function IRIWidget({ isLight }: { isLight?: boolean }) {
  const [iri, setIri] = useState<IRIComponents | null>(null)

  useEffect(() => {
    const update = () => {
      const calculated = iriEngine.calculateIRI()
      setIri(calculated)
      iriEngine.recordSnapshot()
    }

    update()
    const id = window.setInterval(update, 30000)
    return () => window.clearInterval(id)
  }, [])

  const barClass = useMemo(() => {
    const status = iri?.status ?? 'safe'
    if (status === 'safe') return 'bg-emerald-500'
    if (status === 'caution') return 'bg-orange-400'
    if (status === 'warning') return 'bg-orange-500'
    return 'bg-red-500'
  }, [iri?.status])

  if (!iri) return null

  const pct = clamp(iri.overallIRI, 0, 100)

  return (
    <Card className={isLight ? 'border border-slate-900/10 bg-white' : undefined}>
      <CardHeader className={isLight ? 'border-slate-900/10' : undefined}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className={isLight ? 'text-slate-900' : undefined}>Infrastructure Risk Index (IRI)</CardTitle>
            <div className={isLight ? 'mt-1 text-xs text-slate-600' : 'mt-1 text-xs text-white/60'}>
              Unified 0–100 campus risk score (grid + stress + aging + maintenance)
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={statusTone(iri.status)}>
              {statusLabel(iri.status)}
            </Badge>
            {trendIcon(iri.trend)}
            <div className={isLight ? 'rounded-xl border border-slate-900/10 bg-slate-900/5 p-2 text-slate-700' : 'rounded-xl border border-white/10 bg-white/5 p-2 text-white/70'}>
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
            <div className={isLight ? 'text-xs font-semibold text-slate-600' : 'text-xs font-semibold text-white/60'}>Overall IRI</div>
            <div className={isLight ? 'mt-2 text-5xl font-semibold text-slate-900' : 'mt-2 text-5xl font-semibold text-white'}>
              {iri.overallIRI.toFixed(1)}
            </div>
            <div className={isLight ? 'mt-1 text-xs text-slate-600' : 'mt-1 text-xs text-white/60'}>out of 100</div>
          </div>

          <div className="md:col-span-2">
            <div className={isLight ? 'text-xs font-semibold text-slate-600' : 'text-xs font-semibold text-white/60'}>Risk Bar</div>
            <div className={isLight ? 'mt-2 h-3 w-full rounded-full bg-slate-200' : 'mt-2 h-3 w-full rounded-full bg-white/10'}>
              <div className={`h-3 rounded-full transition-all duration-500 ${barClass}`} style={{ width: `${pct}%` }} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className={isLight ? 'rounded-2xl border border-slate-900/10 bg-slate-900/5 p-3 text-center' : 'rounded-2xl border border-white/10 bg-white/5 p-3 text-center'}>
                <div className={isLight ? 'text-[11px] font-semibold text-slate-600' : 'text-[11px] font-semibold text-white/60'}>Grid</div>
                <div className={isLight ? 'mt-1 text-lg font-semibold text-slate-900' : 'mt-1 text-lg font-semibold text-white'}>{Math.round(iri.gridRisk)}</div>
              </div>
              <div className={isLight ? 'rounded-2xl border border-slate-900/10 bg-slate-900/5 p-3 text-center' : 'rounded-2xl border border-white/10 bg-white/5 p-3 text-center'}>
                <div className={isLight ? 'text-[11px] font-semibold text-slate-600' : 'text-[11px] font-semibold text-white/60'}>Stress</div>
                <div className={isLight ? 'mt-1 text-lg font-semibold text-slate-900' : 'mt-1 text-lg font-semibold text-white'}>{Math.round(iri.stressRisk)}</div>
              </div>
              <div className={isLight ? 'rounded-2xl border border-slate-900/10 bg-slate-900/5 p-3 text-center' : 'rounded-2xl border border-white/10 bg-white/5 p-3 text-center'}>
                <div className={isLight ? 'text-[11px] font-semibold text-slate-600' : 'text-[11px] font-semibold text-white/60'}>Aging</div>
                <div className={isLight ? 'mt-1 text-lg font-semibold text-slate-900' : 'mt-1 text-lg font-semibold text-white'}>{Math.round(iri.agingRisk)}</div>
              </div>
              <div className={isLight ? 'rounded-2xl border border-slate-900/10 bg-slate-900/5 p-3 text-center' : 'rounded-2xl border border-white/10 bg-white/5 p-3 text-center'}>
                <div className={isLight ? 'text-[11px] font-semibold text-slate-600' : 'text-[11px] font-semibold text-white/60'}>Maintenance</div>
                <div className={isLight ? 'mt-1 text-lg font-semibold text-slate-900' : 'mt-1 text-lg font-semibold text-white'}>{Math.round(iri.maintenanceRisk)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className={isLight ? 'text-xs text-slate-600' : 'text-xs text-white/50'}>
          Weights: Grid 30%, Stress 25%, Aging 25%, Maintenance 20%. Updates every 30s.
        </div>
      </CardContent>
    </Card>
  )
}

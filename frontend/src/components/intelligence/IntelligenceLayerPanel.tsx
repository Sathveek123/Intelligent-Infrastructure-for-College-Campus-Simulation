import { useMemo, useState } from 'react'
import { BrainCircuit } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/Card'
import RecommendationsDashboard from '@/components/recommendations/RecommendationsDashboard'
import ForecastDashboard from '@/components/intelligence/ForecastDashboard'
import VisualTwinDashboard from '@/components/intelligence/VisualTwinDashboard'
import ResearchDashboard from '@/components/intelligence/ResearchDashboard'

type TabKey = 'recommendations' | 'forecast' | 'twin' | 'research'

export default function IntelligenceLayerPanel({ isLight }: { isLight?: boolean }) {
  const tabs = useMemo(
    () =>
      [
        { key: 'recommendations', label: 'Recommendations' },
        { key: 'forecast', label: 'Forecast' },
        { key: 'twin', label: 'Visual Twin' },
        { key: 'research', label: 'Research' },
      ] as const,
    [],
  )

  const [tab, setTab] = useState<TabKey>('recommendations')

  const shell = isLight ? 'border-slate-900/10 bg-white/95' : 'border-white/10 bg-white/5'
  const textHard = isLight ? 'text-slate-900' : 'text-white'
  const textSoft = isLight ? 'text-slate-600' : 'text-white/60'

  return (
    <Card className={shell}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={isLight ? 'grid h-11 w-11 place-items-center rounded-2xl border border-slate-900/10 bg-slate-900/5 text-slate-700' : 'grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/5 text-white/70'}>
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className={textHard}>AI Intelligence Layer</CardTitle>
              <div className={textSoft + ' mt-1 text-sm'}>Recommendations • Forecasting • Visual Twin • Research</div>
            </div>
          </div>

          <div className="flex items-center gap-2 border-b border-white/10">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={
                  tab === t.key
                    ? isLight
                      ? 'border-b-2 border-brand-600 px-1 py-2 text-sm font-semibold text-slate-900'
                      : 'border-b-2 border-brand-500 px-1 py-2 text-sm font-semibold text-white'
                    : isLight
                      ? 'px-1 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900'
                      : 'px-1 py-2 text-sm font-semibold text-white/60 hover:text-white'
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {tab === 'recommendations' ? <RecommendationsDashboard isLight={isLight} /> : null}
        {tab === 'forecast' ? <ForecastDashboard isLight={isLight} /> : null}
        {tab === 'twin' ? <VisualTwinDashboard isLight={isLight} /> : null}
        {tab === 'research' ? <ResearchDashboard isLight={isLight} /> : null}
      </CardContent>
    </Card>
  )
}

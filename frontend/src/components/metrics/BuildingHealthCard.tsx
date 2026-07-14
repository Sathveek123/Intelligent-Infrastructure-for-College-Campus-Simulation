import { Building2, Info } from 'lucide-react'
import type { BuildingMetrics } from '@/types'
import HealthBadge from '@/ui/HealthBadge'
import { Tooltip } from '@/ui/Tooltip'

type Props = {
  metrics: BuildingMetrics
  onClick?: () => void
}

function ComponentScore({ label, score, weight }: { label: string; score: number; weight: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-1">
        <span className="text-slate-600">{label}</span>
        <Tooltip content={`Contributes ${weight}% to overall score`}>
          <Info size={14} className="text-slate-400" />
        </Tooltip>
      </div>
      <span className="font-semibold text-slate-900">{Math.round(score)}%</span>
    </div>
  )
}

export default function BuildingHealthCard({ metrics, onClick }: Props) {
  const { buildingName, buildingCode, healthScore, healthStatus, components, lastCalculated } = metrics

  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-card"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <Building2 size={20} />
          </div>
          <div className="min-w-0">
            <div className="truncate font-semibold text-slate-900">{buildingName}</div>
            <div className="text-sm text-slate-500">{buildingCode}</div>
          </div>
        </div>
        <HealthBadge status={healthStatus} score={healthScore} size="sm" />
      </div>

      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">Health Score</span>
          <span className="text-sm font-semibold text-slate-900">{Math.round(healthScore)}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-100">
          <div
            className={
              healthStatus === 'healthy'
                ? 'h-2 rounded-full bg-emerald-500'
                : healthStatus === 'moderate'
                  ? 'h-2 rounded-full bg-amber-500'
                  : 'h-2 rounded-full bg-red-500'
            }
            style={{ width: `${Math.max(0, Math.min(100, healthScore))}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <ComponentScore label="Occupancy" score={components.occupancyEfficiency} weight={40} />
        <ComponentScore label="Energy" score={components.energyEfficiency} weight={30} />
        <ComponentScore label="Maintenance" score={components.maintenanceHealth} weight={30} />
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 text-xs text-slate-500">
        <span>Last updated</span>
        <span>{new Date(lastCalculated).toLocaleDateString()}</span>
      </div>
    </div>
  )
}

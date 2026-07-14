import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, TrendingUp, Users, Wrench, Zap, Power, X } from 'lucide-react'
import type { Recommendation } from '@/types/recommendationModel'
import Badge from '@/ui/Badge'
import Button from '@/ui/Button'
import { Card, CardContent } from '@/ui/Card'
import Modal from '@/ui/Modal'

export default function RecommendationCard({
  recommendation,
  onAccept,
  onDismiss,
  onImplement,
}: {
  recommendation: Recommendation
  onAccept: (id: string) => void
  onDismiss: (id: string, reason: string) => void
  onImplement: (id: string) => void
}) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [dismissOpen, setDismissOpen] = useState(false)
  const [dismissReason, setDismissReason] = useState('')

  const meta = useMemo(() => {
    const icon =
      recommendation.category === 'energy'
        ? Zap
        : recommendation.category === 'occupancy'
          ? Users
          : recommendation.category === 'maintenance'
            ? Wrench
            : recommendation.category === 'grid'
              ? Power
              : recommendation.category === 'optimization'
                ? TrendingUp
                : AlertTriangle

    const tone =
      recommendation.severity === 'critical'
        ? 'danger'
        : recommendation.severity === 'high'
          ? 'warning'
          : recommendation.severity === 'medium'
            ? 'info'
            : recommendation.severity === 'low'
              ? 'neutral'
              : 'neutral'

    return { Icon: icon, tone }
  }, [recommendation.category, recommendation.severity])

  const Icon = meta.Icon

  return (
    <>
      <Card className="border-white/10 bg-white/5">
        <CardContent className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/5 text-white">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">{recommendation.title}</div>
                <div className="mt-1 text-sm text-white/70">{recommendation.description}</div>
              </div>
            </div>
            <Badge tone={meta.tone as any}>{recommendation.severity}</Badge>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
              <div className="text-sm">
                <div className="font-semibold text-white">Suggested action</div>
                <div className="mt-1 text-white/70">{recommendation.suggestedAction}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-sm text-white/70">
              <span className="font-semibold text-white">Impact:</span> {recommendation.estimatedImpact.improvement}
              {recommendation.estimatedImpact.unit} {recommendation.estimatedImpact.metric}
            </div>
            <Badge tone="info">Priority {recommendation.priority}</Badge>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
            <div>
              <span className="font-semibold text-white/80">Time:</span> {recommendation.implementation.estimatedTime}
            </div>
            <div>
              <span className="font-semibold text-white/80">Difficulty:</span> {recommendation.implementation.difficulty}
            </div>
            <div>
              <span className="font-semibold text-white/80">Cost:</span> {recommendation.implementation.cost}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
            <Button variant="outline" onClick={() => setDetailsOpen(true)}>
              <Info className="h-4 w-4" />
              Details
            </Button>
            <Button onClick={() => onAccept(recommendation.id)}>Accept</Button>
            <Button variant="secondary" onClick={() => onImplement(recommendation.id)}>
              <CheckCircle2 className="h-4 w-4" />
              Mark Implemented
            </Button>
            <Button variant="danger" onClick={() => setDismissOpen(true)}>
              <X className="h-4 w-4" />
              Dismiss
            </Button>
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={detailsOpen} title="Recommendation Details" onClose={() => setDetailsOpen(false)} size="lg">
        <div className="space-y-4">
          <div className="text-sm text-white/70">
            <div className="text-base font-semibold text-white">Reasoning</div>
            <div className="mt-2 space-y-2">
              {recommendation.reasoning.map((r, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <div className="mt-2 h-1.5 w-1.5 rounded-full bg-brand-400" />
                  <div className="text-sm text-white/70">{r}</div>
                </div>
              ))}
            </div>
          </div>

          {recommendation.affectedBuildings.length ? (
            <div>
              <div className="text-base font-semibold text-white">Affected Buildings</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {recommendation.affectedBuildings.map((b) => (
                  <Badge key={b} tone="neutral">
                    {b}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal
        isOpen={dismissOpen}
        title="Dismiss Recommendation"
        description="Provide a reason so it is tracked in the audit trail."
        onClose={() => setDismissOpen(false)}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setDismissOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={!dismissReason.trim()}
              onClick={() => {
                onDismiss(recommendation.id, dismissReason.trim())
                setDismissReason('')
                setDismissOpen(false)
              }}
            >
              Dismiss
            </Button>
          </>
        }
      >
        <textarea
          value={dismissReason}
          onChange={(e) => setDismissReason(e.target.value)}
          className="h-28 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand-300"
          placeholder="Already implemented / not applicable / alternative solution..."
        />
      </Modal>
    </>
  )
}

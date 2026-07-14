import { useMemo, useState } from 'react'
import { CalendarDays, CheckCircle, Info, XCircle } from 'lucide-react'
import Button from '@/ui/Button'
import Badge from '@/ui/Badge'
import Input from '@/ui/Input'
import Modal from '@/ui/Modal'
import type { PredictedMaintenance } from '@/types'
import { PredictedBadge } from '@/ui/PredictedBadge'

type Props = {
  prediction: PredictedMaintenance
  onConvert: (id: string, date: string, cost?: number) => void
  onDismiss: (id: string, reason: string) => void
}

function priorityTone(priority: PredictedMaintenance['priority']) {
  if (priority === 'critical') return 'danger'
  if (priority === 'high') return 'warning'
  if (priority === 'medium') return 'info'
  return 'neutral'
}

function sourceLabel(source: PredictedMaintenance['source']) {
  return (source ?? 'unknown').replace('_', ' ')
}

export function PredictedMaintenanceCard({ prediction, onConvert, onDismiss }: Props) {
  const [reasonOpen, setReasonOpen] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)
  const [dismissOpen, setDismissOpen] = useState(false)

  const initialDate = useMemo(() => {
    const v = prediction.estimatedDate
    return v.includes('T') ? v.split('T')[0] : v
  }, [prediction.estimatedDate])

  return (
    <>
      <div className="rounded-2xl border border-purple-200 bg-white p-4 transition-shadow hover:shadow-card">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">{prediction.buildingName}</div>
            <div className="text-sm text-slate-500">{prediction.buildingCode}</div>
          </div>
          <PredictedBadge confidence={prediction.confidence ?? 0} size="sm" />
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={priorityTone(prediction.priority)}>{prediction.priority}</Badge>
            <div className="text-xs text-slate-500">Source: {sourceLabel(prediction.source)}</div>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-600">
            <CalendarDays className="h-4 w-4" />
            <span>Recommended: {new Date(prediction.estimatedDate).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setReasonOpen(true)}>
            <Info className="h-4 w-4" />
            View Reason
          </Button>
          <Button onClick={() => setConvertOpen(true)}>
            <CheckCircle className="h-4 w-4" />
            Schedule
          </Button>
          <Button variant="danger" onClick={() => setDismissOpen(true)}>
            <XCircle className="h-4 w-4" />
            Dismiss
          </Button>
        </div>
      </div>

      <Modal isOpen={reasonOpen} onClose={() => setReasonOpen(false)} title="Prediction Analysis" size="lg">
        <div className="space-y-3">
          <div className="text-sm text-slate-700">
            <span className="font-semibold">Confidence:</span> {Math.round(prediction.confidence ?? 0)}%
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">Reasons</div>
            <div className="mt-2 whitespace-pre-line rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              {prediction.predictedReason}
            </div>
          </div>
        </div>
      </Modal>

      <ConvertPredictionModal
        isOpen={convertOpen}
        onClose={() => setConvertOpen(false)}
        initialDate={initialDate}
        onConfirm={(date, cost) => {
          onConvert(prediction.id, date, cost)
          setConvertOpen(false)
        }}
      />

      <DismissPredictionModal
        isOpen={dismissOpen}
        onClose={() => setDismissOpen(false)}
        onConfirm={(reason) => {
          onDismiss(prediction.id, reason)
          setDismissOpen(false)
        }}
      />
    </>
  )
}

function ConvertPredictionModal({
  isOpen,
  onClose,
  initialDate,
  onConfirm,
}: {
  isOpen: boolean
  onClose: () => void
  initialDate: string
  onConfirm: (date: string, cost?: number) => void
}) {
  const [date, setDate] = useState(initialDate)
  const [cost, setCost] = useState('')

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Schedule Maintenance"
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const parsed = cost.trim() ? Number(cost) : undefined
              onConfirm(date, parsed)
            }}
          >
            Confirm
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-700">Scheduled Date</label>
          <div className="mt-1">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-700">Estimated Cost (Optional)</label>
          <div className="mt-1">
            <Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" />
          </div>
        </div>
      </div>
    </Modal>
  )
}

function DismissPredictionModal({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState('')

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Dismiss Prediction"
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" disabled={!reason.trim()} onClick={() => onConfirm(reason)}>
            Dismiss
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <div className="text-sm text-slate-600">Please provide a reason for dismissing this prediction.</div>
        <textarea
          className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-300"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g., Already scheduled, Not applicable, False positive..."
        />
      </div>
    </Modal>
  )
}

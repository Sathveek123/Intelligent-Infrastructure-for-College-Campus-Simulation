import { AlertCircle } from 'lucide-react'
import Button from '@/ui/Button'

type Props = {
  title: string
  message: string
  onRetry?: () => void
}

export default function ErrorState({ title, message, onRetry }: Props) {
  return (
    <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 backdrop-blur">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 text-red-200" />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">{title}</div>
          <div className="mt-1 text-sm text-white/70">{message}</div>
          {onRetry ? (
            <div className="mt-4">
              <Button variant="danger" onClick={onRetry}>
                Retry
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

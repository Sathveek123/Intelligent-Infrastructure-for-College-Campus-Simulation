import { type LucideIcon } from 'lucide-react'
import Button from '@/ui/Button'

type Props = {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: Props) {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-white/15 bg-white/5 p-10 text-center backdrop-blur">
      <Icon className="h-10 w-10 text-white/30" />
      <div className="mt-3 text-sm font-semibold text-white">{title}</div>
      <div className="mt-1 max-w-md text-sm text-white/60">{description}</div>
      {actionLabel && onAction ? (
        <div className="mt-4">
          <Button onClick={onAction}>{actionLabel}</Button>
        </div>
      ) : null}
    </div>
  )
}

import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

type Status = 'healthy' | 'moderate' | 'critical'

type Props = {
  status: Status
  score: number
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  showScore?: boolean
}

export default function HealthBadge({ status, score, size = 'md', showIcon = true, showScore = true }: Props) {
  const config = {
    healthy: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      Icon: CheckCircle,
      label: 'Healthy',
    },
    moderate: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      Icon: AlertTriangle,
      label: 'Moderate',
    },
    critical: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      Icon: XCircle,
      label: 'Critical',
    },
  } satisfies Record<Status, { bg: string; text: string; border: string; Icon: typeof CheckCircle; label: string }>

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  } as const

  const iconSizes = { sm: 14, md: 16, lg: 18 } as const

  const c = config[status]
  const Icon = c.Icon

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${c.bg} ${c.text} ${c.border} ${sizeClasses[size]} font-semibold`}
    >
      {showIcon ? <Icon size={iconSizes[size]} /> : null}
      <span>{c.label}</span>
      {showScore ? <span>({Math.round(score)}%)</span> : null}
    </span>
  )
}

import { Sparkles } from 'lucide-react'

type Props = {
  confidence: number
  size?: 'sm' | 'md'
}

export function PredictedBadge({ confidence, size = 'md' }: Props) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  } as const

  const iconSizes = {
    sm: 12,
    md: 14,
  } as const

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-100 text-purple-800 ${sizeClasses[size]} font-semibold`}
    >
      <Sparkles size={iconSizes[size]} />
      <span>Predicted</span>
      <span className="font-semibold">({Math.round(confidence)}%)</span>
    </span>
  )
}

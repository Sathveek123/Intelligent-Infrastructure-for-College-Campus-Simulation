import clsx from 'clsx'
import type React from 'react'

type Props = {
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'
  children: React.ReactNode
  className?: string
}

export default function Badge({ tone = 'neutral', children, className }: Props) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        tone === 'neutral' && 'bg-white/10 text-white/80',
        tone === 'success' && 'bg-emerald-500/15 text-emerald-200',
        tone === 'warning' && 'bg-orange-500/15 text-orange-200',
        tone === 'danger' && 'bg-red-500/15 text-red-200',
        tone === 'info' && 'bg-blue-500/15 text-blue-200',
        className,
      )}
    >
      {children}
    </span>
  )
}

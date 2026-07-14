import clsx from 'clsx'

type Props = {
  variant?: 'card' | 'table' | 'chart' | 'text'
  count?: number
}

function Shimmer({ className }: { className: string }) {
  return <div className={clsx('animate-pulse rounded-xl bg-white/10', className)} />
}

export default function LoadingSkeleton({ variant = 'text', count = 1 }: Props) {
  if (variant === 'card') {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <Shimmer className="h-3 w-24" />
            <div className="mt-3 flex items-end justify-between">
              <Shimmer className="h-8 w-20" />
              <Shimmer className="h-10 w-10" />
            </div>
            <Shimmer className="mt-4 h-3 w-32" />
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'table') {
    return (
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="grid grid-cols-6 gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <Shimmer className="col-span-2 h-4" />
            <Shimmer className="h-4" />
            <Shimmer className="h-4" />
            <Shimmer className="h-4" />
            <Shimmer className="h-4" />
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'chart') {
    return <Shimmer className="h-72 w-full" />
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Shimmer key={i} className="h-3 w-full" />
      ))}
    </div>
  )
}

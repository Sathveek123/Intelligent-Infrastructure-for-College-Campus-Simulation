import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/Card'
import LoadingSkeleton from '@/ui/LoadingSkeleton'

const loadMap = () => import('./GmritLiveMapInner')
const GmritLiveMapInner = lazy(loadMap)

export default function GmritLiveMapCard({
  isLight,
  onMapClick,
}: {
  isLight?: boolean
  onMapClick?: (pos: { lat: number; lng: number }) => void
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [prefetched, setPrefetched] = useState(false)

  useEffect(() => {
    if (prefetched) return
    const el = wrapRef.current
    if (!el) return

    const prefetch = () => {
      if (prefetched) return
      setPrefetched(true)

      const w = window as any
      if (typeof w.requestIdleCallback === 'function') {
        w.requestIdleCallback(() => {
          void loadMap()
        })
      } else {
        setTimeout(() => {
          void loadMap()
        }, 0)
      }
    }

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            prefetch()
            io.disconnect()
          }
        },
        { rootMargin: '600px 0px' },
      )
      io.observe(el)
      return () => io.disconnect()
    }

    const id = setTimeout(prefetch, 250)
    return () => clearTimeout(id)
  }, [prefetched])

  return (
    <div ref={wrapRef}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>GMRIT Live Map (Street View)</CardTitle>
              <div className={isLight ? 'mt-1 text-xs text-slate-600' : 'mt-1 text-xs text-white/60'}>OpenStreetMap • zoom + pan enabled</div>
            </div>
            <div className={isLight ? 'rounded-xl border border-slate-900/10 bg-slate-900/5 p-2 text-slate-700' : 'rounded-xl border border-white/10 bg-white/5 p-2 text-white/70'}>
              <MapPin className="h-4 w-4" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<LoadingSkeleton variant="chart" count={1} />}>
            <GmritLiveMapInner isLight={isLight} onMapClick={onMapClick} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}

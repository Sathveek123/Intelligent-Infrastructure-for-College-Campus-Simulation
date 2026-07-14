import { useEffect, useMemo, useState } from 'react'
import { Pause, Play, Zap } from 'lucide-react'
import Button from '@/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/Card'
import Badge from '@/ui/Badge'
import { demoModeService } from '@/services/demoModeService'
import { timeEngine } from '@/services/timeEngine'

export default function DemoModeControl({ isLight }: { isLight?: boolean }) {
  const [enabled, setEnabled] = useState(() => demoModeService.isDemoEnabled())
  const [speed, setSpeed] = useState(() => demoModeService.getSpeedMultiplier())

  useEffect(() => {
    setEnabled(demoModeService.isDemoEnabled())
    setSpeed(demoModeService.getSpeedMultiplier())
  }, [])

  const tone = enabled ? 'warning' : 'neutral'

  const subtitle = useMemo(() => {
    return enabled ? `Accelerated mode active (${speed}x)` : 'Accelerate the virtual clock for demos'
  }, [enabled, speed])

  function toggle() {
    if (enabled) {
      demoModeService.disableDemoMode()
      setEnabled(false)
      setSpeed(1)
      timeEngine.syncToNow()
      return
    }

    demoModeService.enableDemoMode(speed)
    setEnabled(true)
    setSpeed(demoModeService.getSpeedMultiplier())
  }

  function onSpeedChange(next: number) {
    setSpeed(next)
    if (enabled) demoModeService.setSpeedMultiplier(next)
  }

  return (
    <Card className={isLight ? 'border border-slate-900/10 bg-white' : undefined}>
      <CardHeader className={isLight ? 'border-slate-900/10' : undefined}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className={isLight ? 'text-slate-900' : undefined}>Demo / Presentation Mode</CardTitle>
            <div className={isLight ? 'mt-1 text-xs text-slate-600' : 'mt-1 text-xs text-white/60'}>{subtitle}</div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={tone as any}>{enabled ? 'DEMO' : 'OFF'}</Badge>
            <Button variant={enabled ? 'outline' : 'primary'} onClick={toggle}>
              {enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {enabled ? 'Stop' : 'Start'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className={isLight ? 'rounded-2xl border border-slate-900/10 bg-slate-900/5 p-4' : 'rounded-2xl border border-white/10 bg-white/5 p-4'}>
          <div className="flex items-center justify-between gap-3">
            <div className={isLight ? 'text-sm font-semibold text-slate-900' : 'text-sm font-semibold text-white'}>
              Speed
            </div>
            <div className={isLight ? 'text-sm font-semibold text-slate-900 tabular-nums' : 'text-sm font-semibold text-white tabular-nums'}>
              {speed}x
            </div>
          </div>
          <input
            type="range"
            min={1}
            max={20}
            value={speed}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            className="mt-3 w-full"
          />
          <div className={isLight ? 'mt-3 flex items-center gap-2 text-xs text-slate-600' : 'mt-3 flex items-center gap-2 text-xs text-white/60'}>
            <Zap className="h-4 w-4" />
            Virtual time advances faster; grid/events/loads react accordingly.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

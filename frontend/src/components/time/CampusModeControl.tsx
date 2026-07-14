import { useEffect, useState } from 'react'
import { Calendar, Clock, Info, Zap } from 'lucide-react'
import Badge from '@/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/Card'
import { timeEngine } from '@/services/timeEngine'
import type { CampusMode, VirtualTime } from '@/types/timeModel'
import clsx from 'clsx'

export default function CampusModeControl() {
  const [virtualTime, setVirtualTime] = useState<VirtualTime>(timeEngine.getVirtualTime())
  const [nowTick, setNowTick] = useState(() => Date.now())

  useEffect(() => {
    const unsubscribe = timeEngine.subscribe(setVirtualTime)
    const id = window.setInterval(() => setNowTick(Date.now()), 1000)
    return () => {
      unsubscribe()
      window.clearInterval(id)
    }
  }, [])

  const modes: CampusMode[] = ['regular', 'exam', 'event', 'vacation', 'maintenance']
  const multipliers = timeEngine.getTimeMultipliers()
  const modeConfig = timeEngine.getCampusModeConfig()

  const timeStr = new Date(virtualTime.currentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const dateStr = new Date(virtualTime.currentDate).toLocaleDateString()

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Virtual Campus Clock</CardTitle>
            <div className="mt-1 text-xs text-white/60">Time-aware simulation multipliers</div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={virtualTime.dayType === 'weekend' ? 'warning' : 'info'}>{virtualTime.dayType}</Badge>
            {virtualTime.isExamWeek ? <Badge tone="warning">Exam week</Badge> : null}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-semibold text-white/60">Virtual time</div>
                <div className="mt-1 text-sm font-semibold text-white">
                  {timeStr} <span className="text-white/60">({virtualTime.timeSlot})</span>
                </div>
                <div className="mt-1 text-xs text-white/50">{dateStr}</div>
                <div className="mt-1 text-[10px] text-white/40">Sync: {new Date(nowTick).toLocaleTimeString()}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/70">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-white/60">
              <Calendar className="h-4 w-4" />
              Academic week {virtualTime.academicWeek} / 16
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-white/60">Campus mode</div>
                <div className="mt-1 text-sm font-semibold text-white">{modeConfig.description}</div>
                <div className="mt-1 flex items-start gap-2 text-xs text-white/50">
                  <Info className="mt-0.5 h-4 w-4" />
                  <div className="leading-relaxed">{modeConfig.typical.join(' • ')}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {modes.map((mode) => {
                  const active = virtualTime.campusMode === mode
                  return (
                    <button
                      key={mode}
                      onClick={() => timeEngine.setCampusMode(mode)}
                      className={clsx(
                        'h-9 rounded-xl border px-3 text-sm font-semibold transition',
                        active ? 'border-white/20 bg-white/10 text-white' : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white',
                      )}
                      type="button"
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <div className="text-xs font-semibold text-white/60">Occupancy multiplier</div>
                <div className="mt-1 text-2xl font-semibold text-white tabular-nums">{Math.round(multipliers.occupancyMultiplier * 100)}%</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-white/60">Energy multiplier</div>
                  <Zap className="h-4 w-4 text-white/50" />
                </div>
                <div className="mt-1 text-2xl font-semibold text-white tabular-nums">{Math.round(multipliers.energyMultiplier * 100)}%</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

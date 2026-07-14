import { useMemo, useState } from 'react'
import { AlertTriangle, Building2, Users, Zap } from 'lucide-react'
import Badge from '@/ui/Badge'
import Button from '@/ui/Button'
import Input from '@/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/Card'
import { fetchBuildings } from '@/services/mockData'
import type { Building } from '@/types'

const SYSTEM_SETTINGS_KEY = 'i2sf_system_settings_v1'

type Result = {
  currentCapacity: number
  currentOccupancy: number
  futureOccupancy: number
  utilizationRate: number
  roomsNeeded: number
  classroomsNeeded: number
  labsNeeded: number
  additionalPowerKw: number
  needsNewBuilding: boolean
  needsExpansion: boolean
  recommendations: string[]
}

function safeNumber(v: unknown, fallback = 0) {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function readPerStudentEnergyFactor() {
  const raw = localStorage.getItem(SYSTEM_SETTINGS_KEY)
  if (!raw) return 0.15
  try {
    const parsed = JSON.parse(raw) as { perStudentEnergyFactor?: number }
    const n = safeNumber(parsed.perStudentEnergyFactor, 0.15)
    return Math.max(0.05, Math.min(2, n))
  } catch {
    return 0.15
  }
}

function estimateBuildingCapacity(b: Building) {
  const rooms = safeNumber(b.totalRooms, 0)
  const fromRooms = rooms * 40
  return Math.max(0, Math.round(fromRooms))
}

function estimateBuildingOccupancy(b: Building) {
  const cap = estimateBuildingCapacity(b)
  const occRate = typeof b.occupancyRate === 'number' ? b.occupancyRate : 0
  return Math.max(0, Math.round((occRate / 100) * cap))
}

function generateRecommendations(args: { utilizationRate: number; roomsNeeded: number; additionalPowerKw: number }) {
  const recs: string[] = []

  if (args.utilizationRate > 90) {
    recs.push('NEW BUILDING REQUIRED: current capacity is insufficient for projected demand.')
  } else if (args.utilizationRate > 80) {
    recs.push(`Expand existing buildings by adding approximately ${args.roomsNeeded} rooms.`)
  } else {
    recs.push('Current infrastructure can accommodate with scheduling + space optimization.')
  }

  if (args.additionalPowerKw > 200) {
    recs.push(`Upgrade power capacity: +${args.additionalPowerKw.toFixed(0)} kW projected.`)
  }

  if (args.roomsNeeded > 20) {
    recs.push(`Staffing: consider ${Math.ceil(args.roomsNeeded / 4)} additional faculty allocations.`)
  }

  recs.push('Schedule preventive maintenance before large expansion.')

  return recs
}

export default function CapacityPlanner({ isLight }: { isLight?: boolean }) {
  const [additionalStudents, setAdditionalStudents] = useState(500)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)

  const perStudentFactor = useMemo(() => readPerStudentEnergyFactor(), [])

  async function calculate() {
    setLoading(true)
    setError(null)
    try {
      const buildings = await fetchBuildings()

      const currentCapacity = buildings.reduce((sum, b) => sum + estimateBuildingCapacity(b), 0)
      const currentOccupancy = buildings.reduce((sum, b) => sum + estimateBuildingOccupancy(b), 0)

      const futureOccupancy = currentOccupancy + Math.max(0, additionalStudents)
      const utilizationRate = currentCapacity > 0 ? (futureOccupancy / currentCapacity) * 100 : 0

      const roomsNeeded = Math.max(0, Math.ceil(additionalStudents / 60))
      const classroomsNeeded = Math.max(0, Math.ceil(roomsNeeded * 0.7))
      const labsNeeded = Math.max(0, Math.ceil(roomsNeeded * 0.3))

      const additionalPowerKw = Math.max(0, additionalStudents * perStudentFactor)

      const needsNewBuilding = utilizationRate > 90
      const needsExpansion = utilizationRate > 80

      const recommendations = generateRecommendations({ utilizationRate, roomsNeeded, additionalPowerKw })

      setResult({
        currentCapacity,
        currentOccupancy,
        futureOccupancy,
        utilizationRate,
        roomsNeeded,
        classroomsNeeded,
        labsNeeded,
        additionalPowerKw,
        needsNewBuilding,
        needsExpansion,
        recommendations,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to calculate')
    } finally {
      setLoading(false)
    }
  }

  const statusTone = !result ? 'neutral' : result.utilizationRate > 90 ? 'danger' : result.utilizationRate > 80 ? 'warning' : 'success'

  return (
    <div className="space-y-6">
      <Card className={isLight ? 'border border-slate-900/10 bg-white' : undefined}>
        <CardHeader className={isLight ? 'border-slate-900/10' : undefined}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className={isLight ? 'text-slate-900' : undefined}>Capacity Planning Tool</CardTitle>
              <div className={isLight ? 'mt-1 text-xs text-slate-600' : 'mt-1 text-xs text-white/60'}>
                What-if planner: add students and see infra + power requirements
              </div>
            </div>
            <Badge tone={statusTone as any}>{result ? 'CALCULATED' : 'READY'}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <div className={isLight ? 'text-xs font-semibold text-slate-600' : 'text-xs font-semibold text-white/60'}>
                Additional students to accommodate
              </div>
              <div className="mt-2">
                <Input
                  type="number"
                  value={additionalStudents}
                  min={0}
                  max={20000}
                  onChange={(e) => setAdditionalStudents(Number(e.target.value))}
                  className={isLight ? 'border-slate-900/10 bg-white text-slate-900 placeholder:text-slate-400 focus:border-brand-500/60' : undefined}
                />
              </div>
              <div className={isLight ? 'mt-2 text-xs text-slate-600' : 'mt-2 text-xs text-white/50'}>
                Power factor: {perStudentFactor.toFixed(2)} kW per student (from Settings)
              </div>
            </div>

            <div className="flex items-end">
              <Button onClick={() => void calculate()} disabled={loading} className="w-full">
                {loading ? 'Calculating…' : 'Calculate Requirements'}
              </Button>
            </div>
          </div>

          {error ? <div className={isLight ? 'mt-4 text-sm text-red-600' : 'mt-4 text-sm text-red-300'}>{error}</div> : null}
        </CardContent>
      </Card>

      {result ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className={isLight ? 'border border-slate-900/10 bg-white' : undefined}>
              <CardContent className="p-5">
                <div className={isLight ? 'text-xs font-semibold text-slate-600' : 'text-xs font-semibold text-white/60'}>Current Occupancy</div>
                <div className={isLight ? 'mt-2 text-3xl font-semibold text-slate-900' : 'mt-2 text-3xl font-semibold'}>{result.currentOccupancy}</div>
              </CardContent>
            </Card>
            <Card className={isLight ? 'border border-slate-900/10 bg-white' : undefined}>
              <CardContent className="p-5">
                <div className={isLight ? 'text-xs font-semibold text-slate-600' : 'text-xs font-semibold text-white/60'}>Future Occupancy</div>
                <div className={isLight ? 'mt-2 text-3xl font-semibold text-slate-900' : 'mt-2 text-3xl font-semibold'}>{result.futureOccupancy}</div>
              </CardContent>
            </Card>
            <Card className={isLight ? 'border border-slate-900/10 bg-white' : undefined}>
              <CardContent className="p-5">
                <div className={isLight ? 'text-xs font-semibold text-slate-600' : 'text-xs font-semibold text-white/60'}>Utilization</div>
                <div className={isLight ? 'mt-2 text-3xl font-semibold text-slate-900' : 'mt-2 text-3xl font-semibold'}>{result.utilizationRate.toFixed(1)}%</div>
                <div className="mt-3">
                  <Badge tone={statusTone as any}>{result.needsNewBuilding ? 'CRITICAL' : result.needsExpansion ? 'EXPAND' : 'OK'}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card className={isLight ? 'border border-slate-900/10 bg-white' : undefined}>
              <CardHeader className={isLight ? 'border-slate-900/10' : undefined}>
                <div className="flex items-center gap-2">
                  <Building2 className={isLight ? 'h-5 w-5 text-slate-600' : 'h-5 w-5 text-white/60'} />
                  <CardTitle className={isLight ? 'text-slate-900' : undefined}>Infrastructure Requirements</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className={isLight ? 'rounded-2xl border border-slate-900/10 bg-slate-900/5 p-4' : 'rounded-2xl border border-white/10 bg-white/5 p-4'}>
                    <div className={isLight ? 'text-xs font-semibold text-slate-600' : 'text-xs font-semibold text-white/60'}>Rooms</div>
                    <div className={isLight ? 'mt-2 text-2xl font-semibold text-slate-900' : 'mt-2 text-2xl font-semibold'}>{result.roomsNeeded}</div>
                  </div>
                  <div className={isLight ? 'rounded-2xl border border-slate-900/10 bg-slate-900/5 p-4' : 'rounded-2xl border border-white/10 bg-white/5 p-4'}>
                    <div className={isLight ? 'text-xs font-semibold text-slate-600' : 'text-xs font-semibold text-white/60'}>Classrooms</div>
                    <div className={isLight ? 'mt-2 text-2xl font-semibold text-slate-900' : 'mt-2 text-2xl font-semibold'}>{result.classroomsNeeded}</div>
                  </div>
                  <div className={isLight ? 'rounded-2xl border border-slate-900/10 bg-slate-900/5 p-4' : 'rounded-2xl border border-white/10 bg-white/5 p-4'}>
                    <div className={isLight ? 'text-xs font-semibold text-slate-600' : 'text-xs font-semibold text-white/60'}>Labs</div>
                    <div className={isLight ? 'mt-2 text-2xl font-semibold text-slate-900' : 'mt-2 text-2xl font-semibold'}>{result.labsNeeded}</div>
                  </div>
                </div>
                <div className={isLight ? 'mt-3 text-xs text-slate-600' : 'mt-3 text-xs text-white/50'}>
                  Assumptions: 60 students per room, 70% classrooms, 30% labs.
                </div>
              </CardContent>
            </Card>

            <Card className={isLight ? 'border border-slate-900/10 bg-white' : undefined}>
              <CardHeader className={isLight ? 'border-slate-900/10' : undefined}>
                <div className="flex items-center gap-2">
                  <Zap className={isLight ? 'h-5 w-5 text-slate-600' : 'h-5 w-5 text-white/60'} />
                  <CardTitle className={isLight ? 'text-slate-900' : undefined}>Power Requirement</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className={isLight ? 'text-xs font-semibold text-slate-600' : 'text-xs font-semibold text-white/60'}>Additional power</div>
                    <div className={isLight ? 'mt-2 text-3xl font-semibold text-slate-900' : 'mt-2 text-3xl font-semibold'}>
                      {result.additionalPowerKw.toFixed(0)} kW
                    </div>
                  </div>
                  <div className={isLight ? 'rounded-2xl border border-slate-900/10 bg-slate-900/5 p-3 text-slate-700' : 'rounded-2xl border border-white/10 bg-white/5 p-3 text-white/70'}>
                    <Users className="h-5 w-5" />
                  </div>
                </div>

                {result.additionalPowerKw > 250 ? (
                  <div className={isLight ? 'mt-4 flex items-start gap-2 text-sm text-orange-700' : 'mt-4 flex items-start gap-2 text-sm text-orange-200'}>
                    <AlertTriangle className="mt-0.5 h-4 w-4" />
                    Grid upgrade recommended for large intake.
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <Card className={isLight ? 'border border-slate-900/10 bg-white' : undefined}>
            <CardHeader className={isLight ? 'border-slate-900/10' : undefined}>
              <CardTitle className={isLight ? 'text-slate-900' : undefined}>Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.recommendations.map((r, idx) => (
                  <div key={idx} className={isLight ? 'rounded-2xl border border-slate-900/10 bg-slate-900/5 p-3 text-sm text-slate-800' : 'rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/80'}>
                    {idx + 1}. {r}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { GitCompare, Info } from 'lucide-react'
import Badge from '@/ui/Badge'
import Button from '@/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/Card'
import { fetchBuildings } from '@/services/mockData'
import type { Building } from '@/types'
import clsx from 'clsx'

function safeNumber(v: unknown, fallback = 0) {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function capFromRooms(rooms: number) {
  return Math.max(0, Math.round(rooms * 40))
}

export default function BuildingComparison({ isLight }: { isLight?: boolean }) {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    void (async () => {
      const b = await fetchBuildings()
      setBuildings(b)
    })()
  }, [])

  function toggle(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 4) return prev
      return [...prev, id]
    })
  }

  const selected = useMemo(() => buildings.filter((b) => selectedIds.includes(b.id)), [buildings, selectedIds])

  const metrics = useMemo(
    () =>
      [
        { key: 'buildingType', label: 'Type', unit: '' },
        { key: 'totalFloors', label: 'Floors', unit: '' },
        { key: 'totalRooms', label: 'Rooms', unit: '' },
        { key: 'capacity', label: 'Est. Capacity', unit: 'students' },
        { key: 'occupancyRate', label: 'Occupancy', unit: '%' },
        { key: 'baseEnergyLoad', label: 'Base Load', unit: 'kW' },
      ] as const,
    [],
  )

  return (
    <div className="space-y-6">
      <Card className={isLight ? 'border border-slate-900/10 bg-white' : undefined}>
        <CardHeader className={isLight ? 'border-slate-900/10' : undefined}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className={isLight ? 'text-slate-900' : undefined}>Compare Buildings</CardTitle>
              <div className={isLight ? 'mt-1 text-xs text-slate-600' : 'mt-1 text-xs text-white/60'}>
                Select up to 4 buildings for side-by-side metrics
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="info">{selectedIds.length}/4</Badge>
              <div className={isLight ? 'rounded-xl border border-slate-900/10 bg-slate-900/5 p-2 text-slate-700' : 'rounded-xl border border-white/10 bg-white/5 p-2 text-white/70'}>
                <GitCompare className="h-4 w-4" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {buildings.map((b) => {
              const active = selectedIds.includes(b.id)
              const disabled = !active && selectedIds.length >= 4
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => toggle(b.id)}
                  disabled={disabled}
                  className={clsx(
                    'h-9 rounded-xl border px-3 text-sm font-semibold transition',
                    active
                      ? isLight
                        ? 'border-brand-500/30 bg-brand-600 text-white'
                        : 'border-white/20 bg-white/10 text-white'
                      : isLight
                        ? 'border-slate-900/10 bg-slate-900/5 text-slate-800 hover:bg-slate-900/10'
                        : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white',
                    disabled && 'cursor-not-allowed opacity-50',
                  )}
                >
                  {b.buildingName}
                </button>
              )
            })}
          </div>

          <div className={isLight ? 'mt-3 flex items-start gap-2 text-xs text-slate-600' : 'mt-3 flex items-start gap-2 text-xs text-white/50'}>
            <Info className="mt-0.5 h-4 w-4" />
            <div>Tip: click again to unselect. Maximum 4 for readability.</div>
          </div>
        </CardContent>
      </Card>

      {selected.length ? (
        <Card className={isLight ? 'border border-slate-900/10 bg-white' : undefined}>
          <CardHeader className={isLight ? 'border-slate-900/10' : undefined}>
            <CardTitle className={isLight ? 'text-slate-900' : undefined}>Comparison Matrix</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className={isLight ? 'w-full min-w-[720px] text-left text-sm text-slate-800' : 'w-full min-w-[720px] text-left text-sm text-white/80'}>
                <thead className={isLight ? 'text-xs font-semibold text-slate-600' : 'text-xs font-semibold text-white/60'}>
                  <tr className={isLight ? 'border-b border-slate-900/10' : 'border-b border-white/10'}>
                    <th className="py-3 pr-4">Metric</th>
                    {selected.map((b) => (
                      <th key={b.id} className="py-3 pr-4 text-center">
                        {b.buildingName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m) => (
                    <tr key={m.key} className={isLight ? 'border-b border-slate-900/10' : 'border-b border-white/10'}>
                      <td className="py-3 pr-4 font-semibold">{m.label}</td>
                      {selected.map((b) => {
                        const value =
                          m.key === 'capacity'
                            ? capFromRooms(safeNumber(b.totalRooms, 0))
                            : m.key === 'occupancyRate'
                              ? safeNumber(b.occupancyRate, 0)
                              : (b as any)[m.key]

                        const formatted =
                          typeof value === 'number'
                            ? m.key === 'occupancyRate'
                              ? `${value.toFixed(1)}${m.unit}`
                              : `${Math.round(value)}${m.unit ? ` ${m.unit}` : ''}`
                            : String(value ?? '-')

                        return (
                          <td key={b.id} className="py-3 pr-4 text-center">
                            {formatted}
                          </td>
                        )
                      })}
                    </tr>
                  ))}

                  <tr className={isLight ? 'border-b border-slate-900/10' : 'border-b border-white/10'}>
                    <td className="py-3 pr-4 font-semibold">Utilization Status</td>
                    {selected.map((b) => {
                      const rate = safeNumber(b.occupancyRate, 0)
                      const tone = rate > 90 ? 'danger' : rate > 75 ? 'warning' : 'success'
                      return (
                        <td key={b.id} className="py-3 pr-4 text-center">
                          <Badge tone={tone as any}>{rate > 90 ? 'OVERLOADED' : rate > 75 ? 'HIGH' : 'OK'}</Badge>
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-end">
              <Button variant="outline" onClick={() => setSelectedIds([])}>
                Clear selection
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

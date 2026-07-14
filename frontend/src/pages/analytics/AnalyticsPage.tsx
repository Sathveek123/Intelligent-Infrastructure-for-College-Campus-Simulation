import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download, Filter } from 'lucide-react'
import Button from '@/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/Card'
import ErrorState from '@/ui/ErrorState'
import LoadingSkeleton from '@/ui/LoadingSkeleton'
import { fetchCorrelation, fetchEnergyTrend, fetchOccupancyTrend } from '@/services/api/analyticsService'
import { fetchBuildings } from '@/services/api/buildingService'
import type { Building, CorrelationData } from '@/types'
import { HealthOverviewGrid } from '@/components/analytics/HealthOverviewGrid'
import { HealthTrendChart } from '@/components/analytics/HealthTrendChart'

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [occupancy, setOccupancy] = useState<Array<{ label: string; value: number }>>([])
  const [energy, setEnergy] = useState<Array<{ day: string; kwh: number }>>([])

  const [buildings, setBuildings] = useState<Building[]>([])
  const [buildingId, setBuildingId] = useState<string>('')

  const [corrLoading, setCorrLoading] = useState(false)
  const [corrError, setCorrError] = useState<string | null>(null)
  const [correlation, setCorrelation] = useState<CorrelationData | null>(null)

  const dateRange = useMemo(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 7)
    return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) }
  }, [])

  const chartTheme = useMemo(
    () => ({
      tick: 'rgba(255,255,255,0.65)',
      axis: 'rgba(255,255,255,0.18)',
      grid: 'rgba(255,255,255,0.10)',
      tooltipBg: 'rgba(2,6,23,0.85)',
      tooltipBorder: 'rgba(255,255,255,0.14)',
    }),
    [],
  )

  const occupancyDistribution = useMemo(() => {
    const low = occupancy.filter((d) => d.value < 50).length
    const medium = occupancy.filter((d) => d.value >= 50 && d.value < 75).length
    const high = occupancy.filter((d) => d.value >= 75).length
    return [
      { name: 'Low (<50%)', value: low },
      { name: 'Medium (50–74%)', value: medium },
      { name: 'High (75%+)', value: high },
    ].filter((x) => x.value > 0)
  }, [occupancy])

  const energyBreakdown = useMemo(() => {
    const values = energy.map((e) => e.kwh)
    const min = values.length ? Math.min(...values) : 0
    const max = values.length ? Math.max(...values) : 0
    const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
    const base = Math.max(0, min)
    const variable = Math.max(0, avg - min)
    const peak = Math.max(0, max - avg)
    return [
      { name: 'Base', value: Number(base.toFixed(2)) },
      { name: 'Variable', value: Number(variable.toFixed(2)) },
      { name: 'Peak', value: Number(peak.toFixed(2)) },
    ].filter((x) => x.value > 0)
  }, [energy])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [occ, eng, bRes] = await Promise.all([fetchOccupancyTrend(dateRange), fetchEnergyTrend(dateRange), fetchBuildings({ page: 1, limit: 200 })])

        setBuildings(bRes.data)
        if (!buildingId) setBuildingId(bRes.data[0]?.id ?? '')

        setOccupancy(occ.map((d) => ({ label: d.date.slice(5), value: d.averageOccupancy })))
        setEnergy(eng.map((d) => ({ day: d.date.slice(5), kwh: d.totalEnergy })))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [dateRange])

  useEffect(() => {
    async function loadCorrelation() {
      if (!buildingId) return
      setCorrLoading(true)
      setCorrError(null)
      try {
        const res = await fetchCorrelation(buildingId, 30)
        setCorrelation(res)
      } catch (e) {
        setCorrError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        setCorrLoading(false)
      }
    }

    void loadCorrelation()
  }, [buildingId])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-white">Analytics</div>
          <div className="text-sm text-white/60">Trends, comparisons, and exports</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton variant="chart" count={2} />
      ) : error ? (
        <ErrorState title="Failed to load analytics" message={error} />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Occupancy (Recent)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={occupancy}>
                    <XAxis dataKey="label" stroke={chartTheme.axis} tick={{ fontSize: 12, fill: chartTheme.tick }} tickLine={{ stroke: chartTheme.axis }} axisLine={{ stroke: chartTheme.axis }} />
                    <YAxis stroke={chartTheme.axis} tick={{ fontSize: 12, fill: chartTheme.tick }} tickLine={{ stroke: chartTheme.axis }} axisLine={{ stroke: chartTheme.axis }} />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.06)' }}
                      contentStyle={{ background: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, borderRadius: 12, color: 'rgba(255,255,255,0.9)' }}
                      labelStyle={{ color: 'rgba(255,255,255,0.75)' }}
                      itemStyle={{ color: 'rgba(255,255,255,0.9)' }}
                    />
                    <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Energy Usage (Trend)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={energy}>
                    <XAxis dataKey="day" stroke={chartTheme.axis} tick={{ fontSize: 12, fill: chartTheme.tick }} tickLine={{ stroke: chartTheme.axis }} axisLine={{ stroke: chartTheme.axis }} />
                    <YAxis stroke={chartTheme.axis} tick={{ fontSize: 12, fill: chartTheme.tick }} tickLine={{ stroke: chartTheme.axis }} axisLine={{ stroke: chartTheme.axis }} />
                    <Tooltip
                      cursor={{ stroke: chartTheme.grid }}
                      contentStyle={{ background: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, borderRadius: 12, color: 'rgba(255,255,255,0.9)' }}
                      labelStyle={{ color: 'rgba(255,255,255,0.75)' }}
                      itemStyle={{ color: 'rgba(255,255,255,0.9)' }}
                    />
                    <Line type="monotone" dataKey="kwh" stroke="#14b8a6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!loading && !error ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Occupancy Distribution (7d)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={occupancyDistribution} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                        {occupancyDistribution.map((_, idx) => (
                          <Cell key={idx} fill={['#60a5fa', '#fbbf24', '#fb7185'][idx % 3]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, borderRadius: 12, color: 'rgba(255,255,255,0.9)' }}
                        labelStyle={{ color: 'rgba(255,255,255,0.75)' }}
                        itemStyle={{ color: 'rgba(255,255,255,0.9)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/70 backdrop-blur">
                  <div className="text-xs font-semibold text-white/60">Legend</div>
                  <div className="mt-3 space-y-2">
                    {occupancyDistribution.length ? (
                      occupancyDistribution.map((d, idx) => (
                        <div key={d.name} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ background: ['#60a5fa', '#fbbf24', '#fb7185'][idx % 3] }} />
                            <div className="truncate text-white/80">{d.name}</div>
                          </div>
                          <div className="font-semibold text-white">{d.value} days</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-white/60">No data.</div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Energy Breakdown (7d)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={energyBreakdown} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                        {energyBreakdown.map((_, idx) => (
                          <Cell key={idx} fill={['#22c55e', '#38bdf8', '#f97316'][idx % 3]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, borderRadius: 12, color: 'rgba(255,255,255,0.9)' }}
                        labelStyle={{ color: 'rgba(255,255,255,0.75)' }}
                        itemStyle={{ color: 'rgba(255,255,255,0.9)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/70 backdrop-blur">
                  <div className="text-xs font-semibold text-white/60">Interpretation</div>
                  <div className="mt-3 space-y-2">
                    {energyBreakdown.length ? (
                      energyBreakdown.map((d, idx) => (
                        <div key={d.name} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ background: ['#22c55e', '#38bdf8', '#f97316'][idx % 3] }} />
                            <div className="truncate text-white/80">{d.name}</div>
                          </div>
                          <div className="font-semibold text-white">{d.value}</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-white/60">No data.</div>
                    )}
                  </div>
                  <div className="mt-4 text-xs text-white/50">
                    Breakdown is computed from min/avg/max of the last 7 days (until backend provides real category splits).
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Health Trends Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <HealthOverviewGrid
            days={7}
            onSelectBuilding={(id) => {
              setBuildingId(id)
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-white">Detailed Building Analysis</CardTitle>
            <div className="flex items-center gap-2">
              <select
                className="h-10 rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/20"
                value={buildingId}
                onChange={(e) => setBuildingId(e.target.value)}
              >
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.buildingName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {buildingId ? <HealthTrendChart buildingId={buildingId} initialDays={30} /> : <div className="text-sm text-white/70">No building selected</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-white">Correlation Analysis (Energy vs Occupancy)</CardTitle>
        </CardHeader>
        <CardContent>
          {corrLoading ? (
            <LoadingSkeleton variant="chart" count={1} />
          ) : corrError ? (
            <ErrorState title="Failed to load correlation" message={corrError} />
          ) : !correlation ? (
            <div className="text-sm text-white/70">No correlation data available.</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={correlation.dates.map((d, i) => ({
                      date: d.slice(5),
                      energy: correlation.energyEfficiency[i],
                      occupancy: correlation.occupancyEfficiency[i],
                    }))}
                  >
                    <XAxis dataKey="date" stroke={chartTheme.axis} tick={{ fontSize: 12, fill: chartTheme.tick }} tickLine={{ stroke: chartTheme.axis }} axisLine={{ stroke: chartTheme.axis }} />
                    <YAxis stroke={chartTheme.axis} tick={{ fontSize: 12, fill: chartTheme.tick }} tickLine={{ stroke: chartTheme.axis }} axisLine={{ stroke: chartTheme.axis }} domain={[0, 100]} />
                    <Tooltip
                      cursor={{ stroke: chartTheme.grid }}
                      contentStyle={{ background: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, borderRadius: 12, color: 'rgba(255,255,255,0.9)' }}
                      labelStyle={{ color: 'rgba(255,255,255,0.75)' }}
                      itemStyle={{ color: 'rgba(255,255,255,0.9)' }}
                    />
                    <Line type="monotone" dataKey="energy" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="occupancy" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="text-xs font-semibold text-white/60">Pearson correlation</div>
                <div className="mt-2 text-3xl font-semibold text-white">{correlation.correlation}</div>
                <div className="mt-3 text-sm text-white/70">{correlation.insight}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Heatmap / Comparisons (Placeholder)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-8 text-sm text-white/70 backdrop-blur">
            Heatmap and building comparison charts will be rendered here once backend analytics endpoints are connected.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

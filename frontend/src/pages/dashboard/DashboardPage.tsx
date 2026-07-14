import { useEffect, useMemo, useRef, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, Download, Moon, RefreshCw, Sun, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Badge from '@/ui/Badge'
import Button from '@/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/Card'
import ErrorState from '@/ui/ErrorState'
import LoadingSkeleton from '@/ui/LoadingSkeleton'
import { formatKwh, formatPercent } from '@/lib/format'
import { fetchDashboardSummary } from '@/services/api/analyticsService'
import { fetchAllBuildingMetrics } from '@/services/api/metricsService'
import type { BuildingMetrics } from '@/types'
import BuildingHealthCard from '@/components/metrics/BuildingHealthCard'
import { fetchBuildings } from '@/services/api/buildingService'
import { fetchMaintenance } from '@/services/api/maintenanceService'
import { fetchActivePredictions } from '@/services/api/predictiveMaintenanceService'
import { fetchAllSimulationRunDetails } from '@/services/api/simulationService'
import CampusModeControl from '@/components/time/CampusModeControl'
import HourlyLoadChart from '@/components/time/HourlyLoadChart'
import AdvancedSystemsPanel from '@/components/advanced/AdvancedSystemsPanel'
import GmritLiveMapCard from '@/components/map/GmritLiveMapCard'
import IntelligenceLayerPanel from '@/components/intelligence/IntelligenceLayerPanel'
import IRIWidget from '@/components/iri/IRIWidget'
import DemoModeControl from '@/components/demo/DemoModeControl'

const DEFAULT_ENERGY = Array.from({ length: 12 }).map((_, i) => ({
  hour: `${i + 8}:00`,
  kwh: 120 + Math.round(Math.sin(i / 2) * 30) + i * 3,
}))

const SYSTEM_SETTINGS_KEY = 'i2sf_system_settings_v1'
const DASHBOARD_THEME_KEY = 'i2sf_dashboard_theme_v1'

function safeNumber(v: unknown, fallback = 0) {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function daySeed() {
  const d = new Date()
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function readSystemOccupancyThreshold() {
  const raw = localStorage.getItem(SYSTEM_SETTINGS_KEY)
  if (!raw) return 75
  try {
    const parsed = JSON.parse(raw) as { occupancyAlertThreshold?: number }
    return typeof parsed.occupancyAlertThreshold === 'number' ? parsed.occupancyAlertThreshold : 75
  } catch {
    return 75
  }
}

function computeEnergySeries(args: {
  buildingCount: number
  totalRooms: number
  occupancyRate: number
  openMaintenance: number
  highStressRuns30d: number
}) {
  const baseCampus = 80 + args.buildingCount * 12 + Math.max(0, args.totalRooms) * 0.18
  const occFactor = 0.5 + Math.max(0, Math.min(1, args.occupancyRate / 100))
  const maintPenalty = 1 + Math.min(0.2, args.openMaintenance * 0.01)
  const stressPenalty = 1 + Math.min(0.25, args.highStressRuns30d * 0.03)
  const adjusted = baseCampus * occFactor * maintPenalty * stressPenalty

  const seed = daySeed() + args.buildingCount * 7 + args.totalRooms * 3 + Math.round(args.occupancyRate)
  return DEFAULT_ENERGY.map((p, idx) => {
    const t = idx / (DEFAULT_ENERGY.length - 1)
    const peak = Math.sin(t * Math.PI)
    const wobble = Math.sin((idx + seed) / 3) * 0.08
    const noise = (seededRandom(seed + idx * 13) - 0.5) * 0.08
    const shape = 0.65 + 0.7 * peak
    const kwh = Math.max(0, Math.round(adjusted * shape * (1 + wobble + noise)))
    return { ...p, kwh }
  })
}

function downloadText(filename: string, content: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<{
    totalBuildings: number
    totalRooms: number
    currentOccupancyRate: number
    activeMaintenanceAlerts: number
    todayEnergyConsumption: number
  } | null>(null)

  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)

  const [dashboardTheme, setDashboardTheme] = useState<'dark' | 'light'>(() => {
    const raw = localStorage.getItem(DASHBOARD_THEME_KEY)
    return raw === 'light' ? 'light' : 'dark'
  })

  const isLight = dashboardTheme === 'light'

  function toggleTheme() {
    setDashboardTheme((t) => {
      const next: 'dark' | 'light' = t === 'dark' ? 'light' : 'dark'
      localStorage.setItem(DASHBOARD_THEME_KEY, next)
      return next
    })
  }

  const [occupancyAlertThreshold, setOccupancyAlertThreshold] = useState(() => readSystemOccupancyThreshold())

  const [liveEnergy, setLiveEnergy] = useState(DEFAULT_ENERGY)
  const [liveEnergyTotal, setLiveEnergyTotal] = useState(DEFAULT_ENERGY.reduce((a, b) => a + b.kwh, 0))
  const [liveStudents, setLiveStudents] = useState<number | null>(null)
  const [displayStudents, setDisplayStudents] = useState(0)
  const [displayOccupancyRate, setDisplayOccupancyRate] = useState(0)
  const [displayPowerLoad, setDisplayPowerLoad] = useState(0)
  const [livePulse, setLivePulse] = useState(false)

  const [mapNote, setMapNote] = useState<{ lat: number; lng: number; at: string } | null>(null)

  const autoRefreshTimer = useRef<number | null>(null)
  const refreshTimeout = useRef<number | null>(null)
  const lastFingerprint = useRef<string>('')
  const lastThreshold = useRef<number>(readSystemOccupancyThreshold())

  const [metricsLoading, setMetricsLoading] = useState(true)
  const [metricsError, setMetricsError] = useState<string | null>(null)
  const [buildingMetrics, setBuildingMetrics] = useState<BuildingMetrics[]>([])
  const [refreshingMetrics, setRefreshingMetrics] = useState(false)

  const [opsLoading, setOpsLoading] = useState(true)
  const [opsError, setOpsError] = useState<string | null>(null)
  const [alerts, setAlerts] = useState<Array<{ id: string; severity: 'critical' | 'high' | 'medium' | 'low'; title: string; message: string }>>([])
  const [simulationInsights, setSimulationInsights] = useState<{
    totalRuns: number
    lastRunAt?: string
    lastRunType?: string
    highStressRuns30d: number
    energyEfficiencyAvg30d?: number
  } | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchDashboardSummary()
        setSummary(data)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  function animateEnergyTo(next: Array<{ hour: string; kwh: number }>) {
    const start = performance.now()
    const from = liveEnergy
    const duration = 750

    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      const ease = 1 - Math.pow(1 - p, 3)
      const blended = next.map((n, i) => {
        const f = from[i]?.kwh ?? n.kwh
        const kwh = Math.round(f + (n.kwh - f) * ease)
        return { hour: n.hour, kwh }
      })
      setLiveEnergy(blended)
      setLiveEnergyTotal(blended.reduce((a, b) => a + b.kwh, 0))
      if (p < 1) requestAnimationFrame(tick)
    }

    setLivePulse(true)
    setTimeout(() => setLivePulse(false), 450)
    requestAnimationFrame(tick)
  }

  async function loadOperational() {
    setOpsLoading(true)
    setOpsError(null)
    try {
      const [bRes, mRes, preds, runs] = await Promise.all([
        fetchBuildings({ page: 1, limit: 500 }),
        fetchMaintenance({ page: 1, limit: 2000 }),
        fetchActivePredictions(),
        fetchAllSimulationRunDetails(),
      ])

      const thresholdNow = readSystemOccupancyThreshold()
      if (thresholdNow !== lastThreshold.current) {
        lastThreshold.current = thresholdNow
        setOccupancyAlertThreshold(thresholdNow)
      }

      const derivedStudents = bRes.data
        .map((b) => {
          const rooms = Number(b.totalRooms ?? 0)
          const rate = Number(b.occupancyRate ?? 0) / 100
          const estimate = rooms * 30 * rate
          return Number.isFinite(estimate) ? estimate : 0
        })
        .reduce((a, b) => a + b, 0)
      setLiveStudents(Math.max(0, Math.round(derivedStudents)))

      const openMaintenanceCount = mRes.data.filter((m) => m.status !== 'completed').length

      const nextAlerts: Array<{ id: string; severity: 'critical' | 'high' | 'medium' | 'low'; title: string; message: string }> = []

      const highOcc = bRes.data
        .filter((b) => typeof b.occupancyRate === 'number' && b.occupancyRate >= occupancyAlertThreshold)
        .sort((a, b) => (b.occupancyRate ?? 0) - (a.occupancyRate ?? 0))
        .slice(0, 6)
      for (const b of highOcc) {
        nextAlerts.push({
          id: `occ_${b.id}`,
          severity: (b.occupancyRate ?? 0) >= 90 ? 'critical' : 'high',
          title: 'High Occupancy',
          message: `${b.buildingName} at ${Math.round(b.occupancyRate ?? 0)}% (threshold ${occupancyAlertThreshold}%)`,
        })
      }

      const openMaintenance = mRes.data
        .filter((m) => m.status !== 'completed')
        .sort((a, b) => {
          const score = (p: string) => (p === 'critical' ? 4 : p === 'high' ? 3 : p === 'medium' ? 2 : 1)
          return score(String(b.priority)) - score(String(a.priority))
        })
        .slice(0, 6)
      for (const m of openMaintenance) {
        nextAlerts.push({
          id: `mnt_${m.id}`,
          severity: m.priority,
          title: 'Maintenance Pending',
          message: `${m.targetName}: ${m.issueDescription}`,
        })
      }

      const topPreds = preds
        .filter((p) => p.status !== 'completed')
        .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
        .slice(0, 6)
      for (const p of topPreds) {
        nextAlerts.push({
          id: `pred_${p.id}`,
          severity: p.priority,
          title: 'Predictive Alert',
          message: `${p.buildingName ?? p.buildingId}: ${p.predictedReason ?? 'Prediction'}`,
        })
      }

      const since30 = new Date()
      since30.setDate(since30.getDate() - 30)
      const recentRuns = runs.filter((r) => (r.createdAt ? new Date(r.createdAt) >= since30 : false))
      const highStressRuns30d = recentRuns.filter((r) => {
        const stress = String((r.result as any)?.stressLevel ?? '')
        return stress === 'high'
      }).length
      const energyEffValues = recentRuns
        .map((r) => (typeof (r.result as any)?.efficiencyScore === 'number' ? ((r.result as any).efficiencyScore as number) : null))
        .filter((v): v is number => typeof v === 'number')
      const energyEfficiencyAvg30d = energyEffValues.length
        ? Math.round((energyEffValues.reduce((a, b) => a + b, 0) / energyEffValues.length) * 10) / 10
        : undefined

      const lastRun = runs[0]
      setSimulationInsights({
        totalRuns: runs.length,
        lastRunAt: lastRun?.createdAt,
        lastRunType: lastRun?.simulationType,
        highStressRuns30d,
        energyEfficiencyAvg30d,
      })

      const fingerprint = JSON.stringify({
        buildings: bRes.data.map((b) => [b.id, safeNumber(b.occupancyRate), safeNumber(b.totalRooms)]),
        maintenance: mRes.data.map((m) => [m.id, m.status, m.priority]),
        preds: preds.map((p) => [p.id, p.status, safeNumber(p.confidence), p.priority]),
        runs: runs.slice(0, 10).map((r) => [r.id, r.createdAt, r.simulationType]),
        threshold: thresholdNow,
      })

      if (fingerprint !== lastFingerprint.current) {
        lastFingerprint.current = fingerprint
        const nextEnergy = computeEnergySeries({
          buildingCount: bRes.data.length,
          totalRooms: bRes.data.reduce((a, b) => a + safeNumber(b.totalRooms), 0),
          occupancyRate: bRes.data.length
            ? bRes.data.reduce((a, b) => a + safeNumber(b.occupancyRate), 0) / bRes.data.length
            : 0,
          openMaintenance: openMaintenanceCount,
          highStressRuns30d,
        })
        animateEnergyTo(nextEnergy)
      }

      setAlerts(nextAlerts.slice(0, 12))
      setLastUpdatedAt(new Date().toISOString())
    } catch (e) {
      setOpsError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setOpsLoading(false)
    }
  }

  useEffect(() => {
    void loadOperational()
  }, [])

  // Smooth KPI animation: keep dashboard values moving (realistic live feel)
  useEffect(() => {
    let raf = 0
    let alive = true

    const drift = {
      students: displayStudents,
      occupancy: displayOccupancyRate,
      power: displayPowerLoad,
    }

    const tick = () => {
      if (!alive) return

      const baseStudents = liveStudents ?? 0
      const baseOcc = safeNumber(summary?.currentOccupancyRate, 0)
      const basePower = liveEnergyTotal

      const t = Date.now() / 1000
      const wobble1 = Math.sin(t / 3.5) * 0.012
      const wobble2 = Math.sin(t / 7.2 + 1.8) * 0.008

      const targetStudents = Math.max(0, Math.round(baseStudents * (1 + wobble1) + Math.sin(t / 5.2) * 8))
      const targetOcc = Math.max(0, Math.min(100, baseOcc * (1 + wobble2) + Math.sin(t / 4.8) * 0.6))
      const targetPower = Math.max(0, basePower * (1 + wobble1 * 0.7 + wobble2 * 0.5))

      const smooth = 0.08
      drift.students = drift.students + (targetStudents - drift.students) * smooth
      drift.occupancy = drift.occupancy + (targetOcc - drift.occupancy) * smooth
      drift.power = drift.power + (targetPower - drift.power) * smooth

      setDisplayStudents(Math.round(drift.students))
      setDisplayOccupancyRate(Math.round(drift.occupancy * 10) / 10)
      setDisplayPowerLoad(Math.round(drift.power))

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
    }
  }, [liveStudents, liveEnergyTotal, summary])

  useEffect(() => {
    const minMs = 9000
    const maxMs = 22000

    function scheduleNext() {
      if (refreshTimeout.current) window.clearTimeout(refreshTimeout.current)
      const jitter = Math.round(minMs + Math.random() * (maxMs - minMs))
      refreshTimeout.current = window.setTimeout(() => {
        void loadOperational()
        void refreshMetrics()
        scheduleNext()
      }, jitter)
    }

    scheduleNext()

    return () => {
      if (autoRefreshTimer.current) window.clearInterval(autoRefreshTimer.current)
      autoRefreshTimer.current = null
      if (refreshTimeout.current) window.clearTimeout(refreshTimeout.current)
      refreshTimeout.current = null
    }
  }, [occupancyAlertThreshold])

  async function loadMetrics() {
    setMetricsLoading(true)
    setMetricsError(null)
    try {
      const data = await fetchAllBuildingMetrics()
      setBuildingMetrics(data)
    } catch (e) {
      setMetricsError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setMetricsLoading(false)
    }
  }

  useEffect(() => {
    void loadMetrics()
  }, [])

  async function refreshMetrics() {
    setRefreshingMetrics(true)
    try {
      await loadMetrics()
    } finally {
      setRefreshingMetrics(false)
    }
  }

  const healthyCount = buildingMetrics.filter((m) => m.healthStatus === 'healthy').length
  const moderateCount = buildingMetrics.filter((m) => m.healthStatus === 'moderate').length
  const criticalCount = buildingMetrics.filter((m) => m.healthStatus === 'critical').length

  function exportSummary() {
    const payload = {
      exportedAt: new Date().toISOString(),
      summary,
      health: { healthyCount, moderateCount, criticalCount },
      occupancyAlertThreshold,
      alerts,
      simulationInsights,
    }
    downloadText(`dashboard_summary_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2), 'application/json')
  }

  return (
    <div className={dashboardTheme === 'light' ? 'dashboard-light space-y-6' : 'space-y-6'}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-white">Admin Dashboard</div>
          <div className="text-sm text-white/60">Real-time overview of campus infrastructure</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={toggleTheme}>
            {dashboardTheme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            {dashboardTheme === 'light' ? 'Dark mode' : 'White mode'}
          </Button>
          <div className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 backdrop-blur md:flex">
            <span className="text-white/50">Last updated</span>
            <span className="font-semibold text-white/80">{lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString() : '—'}</span>
          </div>
          <Button variant="outline" onClick={exportSummary}>
            <Download className="h-4 w-4" />
            Export Summary
          </Button>
          <Button onClick={() => navigate('/app/simulation')}>Run Simulation</Button>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton variant="card" count={4} />
      ) : error ? (
        <ErrorState title="Failed to load dashboard" message={error} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <div className="text-xs font-semibold text-white/60">Total Buildings</div>
              <div className={livePulse ? 'mt-2 text-3xl font-semibold transition-transform duration-300 will-change-transform scale-[1.02]' : 'mt-2 text-3xl font-semibold'}>
                {summary?.totalBuildings ?? 0}
              </div>
              <div className="mt-3"><Badge tone="info">Live</Badge></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="text-xs font-semibold text-white/60">Total Rooms</div>
              <div className={livePulse ? 'mt-2 text-3xl font-semibold transition-transform duration-300 will-change-transform scale-[1.02]' : 'mt-2 text-3xl font-semibold'}>
                {summary?.totalRooms ?? 0}
              </div>
              <div className="mt-3 text-xs text-white/60">Indexed + searchable</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="text-xs font-semibold text-white/60">Overall Occupancy</div>
              <div className={livePulse ? 'mt-2 text-3xl font-semibold transition-transform duration-300 will-change-transform scale-[1.02]' : 'mt-2 text-3xl font-semibold'}>
                {formatPercent(displayOccupancyRate)}
              </div>
              <div className="mt-3"><Badge tone={displayOccupancyRate > 75 ? 'warning' : 'success'}>Live</Badge></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="text-xs font-semibold text-white/60">Students (Estimated)</div>
              <div className={livePulse ? 'mt-2 text-3xl font-semibold transition-transform duration-300 will-change-transform scale-[1.02]' : 'mt-2 text-3xl font-semibold'}>
                {displayStudents}
              </div>
              <div className="mt-3"><Badge tone="danger">Priority</Badge></div>
            </CardContent>
          </Card>
        </div>
      )}

      <IRIWidget isLight={isLight} />

      <CampusModeControl />

      <DemoModeControl isLight={isLight} />

      <HourlyLoadChart isLight={isLight} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <GmritLiveMapCard
            isLight={isLight}
            onMapClick={(pos) => {
              setMapNote({ ...pos, at: new Date().toISOString() })
            }}
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Map Notes</CardTitle>
          </CardHeader>
          <CardContent>
            {mapNote ? (
              <>
                <div className={isLight ? 'text-sm font-semibold text-slate-900' : 'text-sm font-semibold text-white'}>Last clicked point</div>
                <div className={isLight ? 'mt-2 text-sm text-slate-700' : 'mt-2 text-sm text-white/70'}>
                  Lat: <span className="font-mono">{mapNote.lat.toFixed(6)}</span>
                  <br />
                  Lng: <span className="font-mono">{mapNote.lng.toFixed(6)}</span>
                </div>
                <div className={isLight ? 'mt-3 text-xs text-slate-600' : 'mt-3 text-xs text-white/50'}>
                  Click any point on the map to update. Coordinates are copied to clipboard if your browser allows it.
                </div>
              </>
            ) : (
              <>
                <div className={isLight ? 'text-sm text-slate-700' : 'text-sm text-white/70'}>
                  Click on the map to capture coordinates.
                </div>
                <div className={isLight ? 'mt-3 text-xs text-slate-600' : 'mt-3 text-xs text-white/50'}>
                  Tip: You can use this to collect exact pins for Admin/Blocks/Labs and share them to set permanent markers.
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <AdvancedSystemsPanel isLight={isLight} />

      <IntelligenceLayerPanel isLight={isLight} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Energy Consumption (Today)</CardTitle>
                <div className="mt-1 text-xs text-white/60">Campus aggregated kWh by hour</div>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/70">
                <Zap className="h-4 w-4" />
                <span className={livePulse ? 'transition-opacity duration-300 opacity-100' : 'opacity-90'}>{formatKwh(liveEnergyTotal)}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={liveEnergy}>
                  <CartesianGrid stroke={isLight ? 'rgba(15,23,42,0.10)' : 'rgba(255,255,255,0.10)'} vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 12, fill: isLight ? 'rgba(15,23,42,0.70)' : 'rgba(255,255,255,0.70)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: isLight ? 'rgba(15,23,42,0.70)' : 'rgba(255,255,255,0.70)' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: isLight ? 'rgba(255,255,255,0.98)' : 'rgba(2,6,23,0.92)',
                      border: isLight ? '1px solid rgba(15,23,42,0.16)' : '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 12,
                      color: isLight ? 'rgb(15,23,42)' : 'rgba(255,255,255,0.92)',
                      boxShadow: isLight ? '0 16px 40px rgba(2,6,23,0.12)' : '0 16px 40px rgba(0,0,0,0.35)',
                    }}
                    labelStyle={{ color: isLight ? 'rgba(15,23,42,0.70)' : 'rgba(255,255,255,0.70)' }}
                    itemStyle={{ color: isLight ? 'rgb(15,23,42)' : 'rgba(255,255,255,0.92)' }}
                  />
                  <Line type="monotone" dataKey="kwh" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Operational Alerts</CardTitle>
                <div className="mt-1 text-xs text-white/60">Live signals from occupancy, maintenance, predictions, and simulations</div>
              </div>
              <Button variant="outline" onClick={() => void loadOperational()} disabled={opsLoading}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {opsLoading ? (
              <LoadingSkeleton variant="text" count={5} />
            ) : opsError ? (
              <ErrorState title="Failed to load alerts" message={opsError} onRetry={() => void loadOperational()} />
            ) : alerts.length === 0 ? (
              <div className="text-sm text-white/70">No alerts right now.</div>
            ) : (
              <div className="space-y-2">
                {alerts.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur">
                    <div className="mt-0.5 rounded-xl border border-white/10 bg-white/5 p-2 text-white/70">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold text-white">{a.title}</div>
                        <Badge tone={a.severity === 'critical' ? 'danger' : a.severity === 'high' ? 'warning' : 'info'}>{a.severity}</Badge>
                      </div>
                      <div className="mt-0.5 text-xs text-white/60">{a.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <div className="text-xs font-semibold text-white/60">Simulation Insights (30 days)</div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-white/60">Total runs</div>
                  <div className="mt-1 font-semibold text-white">{simulationInsights?.totalRuns ?? 0}</div>
                </div>
                <div>
                  <div className="text-white/60">High stress runs</div>
                  <div className="mt-1 font-semibold text-white">{simulationInsights?.highStressRuns30d ?? 0}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-white/60">Avg energy efficiency</div>
                  <div className="mt-1 font-semibold text-white">{simulationInsights?.energyEfficiencyAvg30d ?? '-'}%</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-white/50">
                Thresholds: occupancy alert ≥ {occupancyAlertThreshold}%
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-white">Building Health Overview</div>
            <div className="text-sm text-white/60">Scores update automatically after simulations</div>
          </div>
          <Button variant="outline" onClick={refreshMetrics} disabled={refreshingMetrics}>
            <RefreshCw className={refreshingMetrics ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            Refresh
          </Button>
        </div>

        {metricsLoading ? (
          <LoadingSkeleton variant="card" count={3} />
        ) : metricsError ? (
          <ErrorState title="Failed to load building metrics" message={metricsError} onRetry={() => void loadMetrics()} />
        ) : buildingMetrics.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/70 backdrop-blur">
            No building metrics available yet. Run simulations to generate health scores.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {buildingMetrics.map((m) => (
              <BuildingHealthCard key={m.buildingId} metrics={m} />
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-5">
              <div className="text-xs font-semibold text-white/60">Healthy</div>
              <div className="mt-2 text-3xl font-semibold text-emerald-200">{healthyCount}</div>
              <div className="mt-2 text-xs text-white/60">of {buildingMetrics.length} buildings</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="text-xs font-semibold text-white/60">Moderate</div>
              <div className="mt-2 text-3xl font-semibold text-orange-200">{moderateCount}</div>
              <div className="mt-2 text-xs text-white/60">of {buildingMetrics.length} buildings</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="text-xs font-semibold text-white/60">Critical</div>
              <div className="mt-2 text-3xl font-semibold text-red-200">{criticalCount}</div>
              <div className="mt-2 text-xs text-white/60">of {buildingMetrics.length} buildings</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

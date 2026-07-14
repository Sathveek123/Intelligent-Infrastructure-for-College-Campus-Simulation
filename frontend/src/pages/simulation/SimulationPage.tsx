import { useEffect, useMemo, useState } from 'react'
import { Activity, Download, Play, Printer, Save } from 'lucide-react'
import Badge from '@/ui/Badge'
import Button from '@/ui/Button'
import Input from '@/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/Card'
import ErrorState from '@/ui/ErrorState'
import LoadingSkeleton from '@/ui/LoadingSkeleton'
import LoadingOverlay from '@/ui/LoadingOverlay'
import { useToast } from '@/ui/toast'
import type { Building } from '@/types'
import { fetchBuildings } from '@/services/api/buildingService'
import {
  type SimulationRunDetails,
  type SimulationRunLite,
  fetchSimulationHistory,
  fetchSimulationRunDetails,
  runOccupancySimulation,
} from '@/services/api/simulationService'

function occTone(v: number) {
  if (v <= 50) return 'success'
  if (v <= 75) return 'warning'
  return 'danger'
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

function toCsvRow(values: Array<string | number | null | undefined>) {
  return values
    .map((v) => {
      const s = v == null ? '' : String(v)
      const escaped = s.replaceAll('"', '""')
      return `"${escaped}"`
    })
    .join(',')
}

function buildSimulationReportHtml(run: SimulationRunDetails) {
  const title = `Simulation Report · ${run.simulationType.toUpperCase()}`
  const when = run.createdAt ? new Date(run.createdAt).toLocaleString() : '-'
  const building = run.building?.buildingName ?? '-'
  const creator = run.creator?.name ?? '-'
  const payload = JSON.stringify(run.payload, null, 2)
  const result = JSON.stringify(run.result, null, 2)

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    :root { color-scheme: light; }
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; margin: 24px; color: #0f172a; }
    h1 { font-size: 20px; margin: 0 0 8px; }
    .meta { font-size: 12px; color: #475569; margin-bottom: 16px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; background: #ffffff; }
    .label { font-size: 11px; color: #64748b; font-weight: 600; }
    .value { font-size: 13px; font-weight: 600; margin-top: 4px; }
    pre { white-space: pre-wrap; word-break: break-word; background: #0b1220; color: #e2e8f0; padding: 12px; border-radius: 12px; overflow: auto; }
    .actions { margin-top: 16px; display: flex; gap: 8px; }
    button { padding: 10px 12px; border-radius: 10px; border: 1px solid #cbd5e1; background: #f8fafc; cursor: pointer; }
    button:hover { background: #f1f5f9; }
    @media print { .actions { display: none; } body { margin: 0; } }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">Generated: ${new Date().toLocaleString()} · Run ID: ${run.id}</div>

  <div class="grid">
    <div class="card"><div class="label">Building</div><div class="value">${building}</div></div>
    <div class="card"><div class="label">Created By</div><div class="value">${creator}</div></div>
    <div class="card"><div class="label">When</div><div class="value">${when}</div></div>
    <div class="card"><div class="label">Type</div><div class="value">${run.simulationType}</div></div>
  </div>

  <div class="actions">
    <button onclick="window.print()">Print</button>
    <button onclick="window.close()">Close</button>
  </div>

  <h2 style="margin-top:18px;font-size:14px;">Inputs</h2>
  <pre>${payload}</pre>

  <h2 style="margin-top:18px;font-size:14px;">Results</h2>
  <pre>${result}</pre>
</body>
</html>`
}

export default function SimulationPage() {
  const { push } = useToast()
  const [activeTab, setActiveTab] = useState<'run' | 'history'>('run')
  const [students, setStudents] = useState(120)
  const [capacity, setCapacity] = useState(180)
  const [equipmentLoad, setEquipmentLoad] = useState(35)
  const [baseLoad, setBaseLoad] = useState(120)
  const [perStudentFactor, setPerStudentFactor] = useState(0.35)

  const [buildings, setBuildings] = useState<Building[]>([])
  const [buildingId, setBuildingId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)

  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [historyItems, setHistoryItems] = useState<SimulationRunLite[]>([])
  const [historyPage, setHistoryPage] = useState(1)
  const [historyLimit, setHistoryLimit] = useState(10)
  const [historyTotal, setHistoryTotal] = useState(0)
  const [historyTotalPages, setHistoryTotalPages] = useState(1)

  const [backendResult, setBackendResult] = useState<{ occupancyRate: number; stressLevel: 'low' | 'medium' | 'high' } | null>(null)

  async function openPrintableReport(runId: string) {
    try {
      const run = await fetchSimulationRunDetails(runId)
      const html = buildSimulationReportHtml(run)
      const w = window.open('', '_blank')
      if (!w) throw new Error('Popup blocked. Please allow popups for this site.')
      w.document.open()
      w.document.write(html)
      w.document.close()
    } catch (e) {
      push({ tone: 'error', title: 'Report failed', message: e instanceof Error ? e.message : 'Unknown error' })
    }
  }

  async function downloadRunJson(runId: string) {
    try {
      const run = await fetchSimulationRunDetails(runId)
      downloadText(`simulation_${runId}.json`, JSON.stringify(run, null, 2), 'application/json')
      push({ tone: 'success', title: 'Downloaded JSON' })
    } catch (e) {
      push({ tone: 'error', title: 'Download failed', message: e instanceof Error ? e.message : 'Unknown error' })
    }
  }

  async function downloadRunCsv(runId: string) {
    try {
      const run = await fetchSimulationRunDetails(runId)
      const header = toCsvRow(['id', 'createdAt', 'type', 'buildingName', 'creatorName', 'payload', 'result'])
      const row = toCsvRow([
        run.id,
        run.createdAt,
        run.simulationType,
        run.building?.buildingName ?? '',
        run.creator?.name ?? '',
        JSON.stringify(run.payload),
        JSON.stringify(run.result),
      ])
      downloadText(`simulation_${runId}.csv`, `${header}\n${row}\n`, 'text/csv')
      push({ tone: 'success', title: 'Downloaded CSV' })
    } catch (e) {
      push({ tone: 'error', title: 'Download failed', message: e instanceof Error ? e.message : 'Unknown error' })
    }
  }

  async function loadHistory(next?: { page?: number; limit?: number }) {
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const page = next?.page ?? historyPage
      const limit = next?.limit ?? historyLimit
      const res = await fetchSimulationHistory({ page, limit })
      setHistoryItems(res.data)
      setHistoryTotal(res.total)
      setHistoryTotalPages(res.totalPages)
    } catch (e) {
      setHistoryError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab !== 'history') return
    void loadHistory()
  }, [activeTab, historyPage, historyLimit])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetchBuildings({ page: 1, limit: 200 })
        setBuildings(res.data)
        setBuildingId(res.data[0]?.id ?? '')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        setLoading(false)
      }

    }

    void load()
  }, [])

  const occupancyRate = useMemo(() => {
    if (capacity <= 0) return 0
    return Math.max(0, Math.min(100, (students / capacity) * 100))
  }, [students, capacity])

  const energyLoad = useMemo(() => {
    return baseLoad + students * perStudentFactor + equipmentLoad
  }, [baseLoad, students, perStudentFactor, equipmentLoad])

  async function run() {
    if (!buildingId) {
      push({ tone: 'error', title: 'Select a building first' })
      return
    }
    setRunning(true)
    try {
      const res = await runOccupancySimulation({ buildingId, totalStudents: students })
      setBackendResult({ occupancyRate: res.occupancyRate ?? 0, stressLevel: res.stressLevel ?? 'low' })
      push({ tone: 'success', title: 'Simulation completed' })
    } catch (e) {
      push({ tone: 'error', title: 'Simulation failed', message: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-6">
      {running ? <LoadingOverlay message="Running simulation…" /> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-white">Simulation</div>
          <div className="text-sm text-white/60">Run occupancy and energy simulations with configurable inputs</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Save className="h-4 w-4" />
            Save
          </Button>
          <Button onClick={run} disabled={running || loading || !!error}>
            <Play className="h-4 w-4" />
            {running ? 'Running…' : 'Run'}
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton variant="card" count={3} />
      ) : error ? (
        <ErrorState title="Failed to load simulation" message={error} />
      ) : (
        <>
          <div className="flex items-center gap-2 border-b border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab('run')}
              className={
                activeTab === 'run'
                  ? 'border-b-2 border-brand-500 px-1 py-2 text-sm font-semibold text-white'
                  : 'px-1 py-2 text-sm font-semibold text-white/60 hover:text-white'
              }
            >
              Run
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={
                activeTab === 'history'
                  ? 'border-b-2 border-brand-500 px-1 py-2 text-sm font-semibold text-white'
                  : 'px-1 py-2 text-sm font-semibold text-white/60 hover:text-white'
              }
            >
              History
            </button>
          </div>

          {activeTab === 'run' ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Inputs</CardTitle>
                    <Activity className="h-5 w-5 text-white/50" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-white/70">Building</label>
                    <div className="mt-1">
                      <select
                        className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/20"
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
                  <div>
                    <label className="text-xs font-semibold text-white/70">Students</label>
                    <div className="mt-1">
                      <Input type="number" value={students} onChange={(e) => setStudents(Number(e.target.value))} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-white/70">Room Capacity</label>
                    <div className="mt-1">
                      <Input type="number" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
                    </div>
                  </div>
                  <div className="border-t border-white/10 pt-4">
                    <div className="text-xs font-semibold text-white/60">Energy Model</div>
                    <div className="mt-3 grid grid-cols-1 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-white/70">Base Load (kWh)</label>
                        <div className="mt-1">
                          <Input type="number" value={baseLoad} onChange={(e) => setBaseLoad(Number(e.target.value))} />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-white/70">Per Student Factor</label>
                        <div className="mt-1">
                          <Input type="number" step="0.01" value={perStudentFactor} onChange={(e) => setPerStudentFactor(Number(e.target.value))} />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-white/70">Equipment Load (kWh)</label>
                        <div className="mt-1">
                          <Input type="number" value={equipmentLoad} onChange={(e) => setEquipmentLoad(Number(e.target.value))} />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle>Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                      <div className="text-xs font-semibold text-white/60">Occupancy Rate</div>
                      <div className="mt-2 text-3xl font-semibold text-white">{Math.round(backendResult?.occupancyRate ?? occupancyRate)}%</div>
                      <div className="mt-2">
                        <Badge tone={occTone(backendResult?.occupancyRate ?? occupancyRate)}>{backendResult?.stressLevel ?? 'Level'}</Badge>
                      </div>
                      <div className="mt-4 h-2 w-full rounded-full bg-white/10">
                        <div
                          className="h-2 rounded-full bg-brand-600"
                          style={{ width: `${backendResult?.occupancyRate ?? occupancyRate}%` }}
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                      <div className="text-xs font-semibold text-white/60">Energy Load</div>
                      <div className="mt-2 text-3xl font-semibold text-white">{energyLoad.toFixed(1)} kWh</div>
                      <div className="mt-2 text-sm text-white/70">Base + Students + Equipment</div>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="text-white/60">Base</div>
                          <div className="mt-1 font-semibold text-white">{baseLoad}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="text-white/60">Students</div>
                          <div className="mt-1 font-semibold text-white">{(students * perStudentFactor).toFixed(1)}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="text-white/60">Equip</div>
                          <div className="mt-1 font-semibold text-white">{equipmentLoad}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                    <div className="text-sm font-semibold">Recommendations (Preview)</div>
                    <div className="mt-2 space-y-2 text-sm text-white/70">
                      <div>- If occupancy &gt; 75%, split into parallel rooms or shift time slot.</div>
                      <div>- If energy exceeds threshold, reduce equipment load or stagger usage.</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle>Simulation History</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-semibold text-white/60">Page size</div>
                    <select
                      className="h-9 rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/20"
                      value={historyLimit}
                      onChange={(e) => {
                        const next = Number(e.target.value)
                        setHistoryPage(1)
                        setHistoryLimit(next)
                      }}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <LoadingSkeleton variant="table" count={6} />
                ) : historyError ? (
                  <ErrorState title="Failed to load history" message={historyError} onRetry={() => void loadHistory()} />
                ) : historyItems.length === 0 ? (
                  <div className="text-sm text-white/70">No runs yet.</div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="text-xs font-semibold text-white/60">
                          <tr className="border-b border-white/10">
                            <th className="py-3">When</th>
                            <th className="py-3">Type</th>
                            <th className="py-3">Building</th>
                            <th className="py-3">Created By</th>
                            <th className="py-3 text-right">Report</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyItems.map((h) => (
                            <tr key={h.id} className="border-b border-white/5 hover:bg-white/5">
                              <td className="py-3 text-white/80">{h.createdAt ? new Date(h.createdAt).toLocaleString() : '-'}</td>
                              <td className="py-3 text-white/80">{h.simulationType}</td>
                              <td className="py-3 text-white/80">{h.building?.buildingName ?? '-'}</td>
                              <td className="py-3 text-white/80">{h.creator?.name ?? '-'}</td>
                              <td className="py-3">
                                <div className="flex items-center justify-end gap-2">
                                  <Button variant="outline" onClick={() => void openPrintableReport(h.id)}>
                                    <Printer className="h-4 w-4" />
                                    Print
                                  </Button>
                                  <Button variant="outline" onClick={() => void downloadRunJson(h.id)}>
                                    <Download className="h-4 w-4" />
                                    JSON
                                  </Button>
                                  <Button variant="outline" onClick={() => void downloadRunCsv(h.id)}>
                                    <Download className="h-4 w-4" />
                                    CSV
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                      <div className="text-white/70">
                        Page {historyPage} / {historyTotalPages} · Total {historyTotal}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" disabled={historyPage <= 1} onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}>
                          Prev
                        </Button>

                        <div className="flex items-center gap-1">
                          {(() => {
                            const pages: Array<number | 'ellipsis'> = []
                            if (historyTotalPages <= 9) {
                              for (let i = 1; i <= historyTotalPages; i++) pages.push(i)
                            } else {
                              pages.push(1)
                              const start = Math.max(2, historyPage - 2)
                              const end = Math.min(historyTotalPages - 1, historyPage + 2)
                              if (start > 2) pages.push('ellipsis')
                              for (let i = start; i <= end; i++) pages.push(i)
                              if (end < historyTotalPages - 1) pages.push('ellipsis')
                              pages.push(historyTotalPages)
                            }
                            return pages.map((p, idx) => {
                              if (p === 'ellipsis') {
                                return (
                                  <div key={`e-${idx}`} className="px-2 text-white/40">
                                    …
                                  </div>
                                )
                              }
                              return (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => setHistoryPage(p)}
                                  className={
                                    p === historyPage
                                      ? 'h-9 rounded-xl bg-brand-600 px-3 text-sm font-semibold text-white'
                                      : 'h-9 rounded-xl border border-white/15 bg-white/5 px-3 text-sm font-semibold text-white/80 hover:bg-white/10'
                                  }
                                >
                                  {p}
                                </button>
                              )
                            })
                          })()}
                        </div>

                        <Button
                          variant="outline"
                          disabled={historyPage >= historyTotalPages}
                          onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

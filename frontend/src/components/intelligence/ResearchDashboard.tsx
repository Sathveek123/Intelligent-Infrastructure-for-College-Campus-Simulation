import { useMemo, useState } from 'react'
import { Download, FileText, RefreshCw } from 'lucide-react'
import Button from '@/ui/Button'
import Badge from '@/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/Card'
import { recommendationEngine } from '@/services/recommendationEngine'
import { gridEngine } from '@/services/gridEngine'
import { timeEngine } from '@/services/timeEngine'

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

function toCsvRow(values: string[]) {
  const escaped = values.map((v) => {
    const s = String(v ?? '')
    if (s.includes('"') || s.includes(',') || s.includes('\n')) return `"${s.replaceAll('"', '""')}"`
    return s
  })
  return escaped.join(',')
}

export default function ResearchDashboard({ isLight }: { isLight?: boolean }) {
  const [tick, setTick] = useState(0)

  const recs = useMemo(() => recommendationEngine.getAllRecommendations(), [tick])
  const pending = useMemo(() => recs.filter((r) => r.status === 'pending'), [recs])
  const grid = gridEngine.getGrid()
  const vt = timeEngine.getVirtualTime()

  const narrative = useMemo(() => {
    const lines: string[] = []
    lines.push(`Virtual campus time: ${vt.currentDate.toISOString()} (${vt.timeSlot}, ${vt.campusMode}, ${vt.dayType})`)
    lines.push(`Grid utilization: ${Number(grid.utilization ?? 0).toFixed(1)}% (${Number(grid.totalLoad ?? 0).toFixed(0)} / ${Number(grid.totalCapacity ?? 0).toFixed(0)} kW)`)
    lines.push(`Recommendations pending: ${pending.length}`)

    const critical = pending.filter((r) => r.severity === 'critical')
    if (critical.length) {
      lines.push('Critical actions:')
      for (const c of critical.slice(0, 5)) lines.push(`- ${c.title} (priority ${c.priority})`)
    }

    const byCat = pending.reduce((acc: Record<string, number>, r) => {
      acc[r.category] = (acc[r.category] ?? 0) + 1
      return acc
    }, {})

    if (Object.keys(byCat).length) {
      lines.push('Category distribution:')
      for (const [k, v] of Object.entries(byCat)) lines.push(`- ${k}: ${v}`)
    }

    lines.push('Suggested next steps:')
    lines.push('- Accept the highest priority recommendation and assign an owner.')
    lines.push('- Use Forecast to schedule load shifting for peak periods.')
    lines.push('- Use Visual Twin to target top-risk buildings for maintenance inspections.')

    return lines.join('\n')
  }, [pending, grid, vt])

  const shell = isLight ? 'border-slate-900/10 bg-white/95' : 'border-white/10 bg-white/5'
  const textHard = isLight ? 'text-slate-900' : 'text-white'
  const textSoft = isLight ? 'text-slate-600' : 'text-white/60'

  function exportJson() {
    downloadText(`i2sf_research_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ generatedAt: new Date().toISOString(), narrative, recommendations: recs, grid }, null, 2), 'application/json')
  }

  function exportCsv() {
    const header = toCsvRow(['id', 'title', 'category', 'severity', 'priority', 'status', 'generatedAt', 'affectedBuildings', 'suggestedAction'])
    const rows = recs.map((r) =>
      toCsvRow([
        r.id,
        r.title,
        r.category,
        r.severity,
        String(r.priority),
        r.status,
        new Date(r.generatedAt).toISOString(),
        r.affectedBuildings.join('|'),
        r.suggestedAction,
      ]),
    )
    downloadText(`i2sf_recommendations_${new Date().toISOString().slice(0, 10)}.csv`, `${header}\n${rows.join('\n')}\n`, 'text/csv')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={isLight ? 'grid h-11 w-11 place-items-center rounded-2xl border border-slate-900/10 bg-slate-900/5 text-slate-700' : 'grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/5 text-white/70'}>
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <div className={textHard + ' text-base font-semibold'}>Research Layer</div>
            <div className={textSoft + ' text-sm'}>Auto-generated report notes + offline exports</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setTick((x) => x + 1)}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportJson}>
            <Download className="h-4 w-4" />
            Export JSON
          </Button>
          <Button variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card className={shell}>
        <CardHeader>
          <CardTitle className={textHard}>Executive summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="info">Offline</Badge>
            <Badge tone={pending.length ? 'warning' : 'success'}>{pending.length} pending</Badge>
            <Badge tone={Number(grid.utilization ?? 0) > 85 ? 'warning' : 'success'}>{Number(grid.utilization ?? 0).toFixed(1)}% grid</Badge>
          </div>
          <pre className={isLight ? 'mt-4 whitespace-pre-wrap rounded-2xl border border-slate-900/10 bg-slate-900/5 p-4 text-sm text-slate-900' : 'mt-4 whitespace-pre-wrap rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-white'}>
            {narrative}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}

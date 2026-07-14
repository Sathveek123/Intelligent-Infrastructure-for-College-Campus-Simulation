import { Download, FileText, Plus } from 'lucide-react'
import Button from '@/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/Card'
import { useToast } from '@/ui/toast'
import { reportExportService } from '@/services/reportExportService'

const reports = [
  { id: 'rep1', name: 'Monthly Infrastructure Report', range: 'Jan 01 - Jan 31', status: 'generated' },
  { id: 'rep2', name: 'Energy Usage Report', range: 'Feb 01 - Feb 07', status: 'pending' },
]

export default function ReportsPage() {
  const { push } = useToast()

  async function exportComprehensive(kind: 'json' | 'text') {
    try {
      const report = await reportExportService.generateComprehensiveReport()
      if (kind === 'json') reportExportService.exportAsJSON(report)
      else reportExportService.exportAsText(report)
      push({ tone: 'success', title: 'Report exported', message: kind === 'json' ? 'Downloaded JSON report.' : 'Downloaded text report.' })
    } catch (e) {
      push({ tone: 'error', title: 'Export failed', message: e instanceof Error ? e.message : 'Failed to export report' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-white">Reports</div>
          <div className="text-sm text-white/60">Generate and download PDF/CSV reports</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => void exportComprehensive('json')}>
            <Download className="h-4 w-4" />
            Export JSON
          </Button>
          <Button variant="outline" onClick={() => void exportComprehensive('text')}>
            <Download className="h-4 w-4" />
            Export Text
          </Button>
          <Button onClick={() => void exportComprehensive('json')}>
            <Plus className="h-4 w-4" />
            Generate
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-white/50" />
            <CardTitle>Generated Reports</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs font-semibold text-white/60">
                <tr className="border-b border-white/10">
                  <th className="py-3">Report</th>
                  <th className="py-3">Date Range</th>
                  <th className="py-3">Status</th>
                  <th className="py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 font-semibold text-white">{r.name}</td>
                    <td className="py-3 text-white/80">{r.range}</td>
                    <td className="py-3 text-white/80">{r.status}</td>
                    <td className="py-3 text-right">
                      <Button variant="outline" disabled={r.status !== 'generated'}>
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

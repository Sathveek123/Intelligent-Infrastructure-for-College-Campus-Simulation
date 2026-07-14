import SystemHealthDashboard from '@/components/health/SystemHealthDashboard'

export default function SystemHealthPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-lg font-semibold text-white">System Health</div>
        <div className="text-sm text-white/60">Traffic-light checks across grid, buildings, maintenance, and time engine</div>
      </div>

      <SystemHealthDashboard />
    </div>
  )
}

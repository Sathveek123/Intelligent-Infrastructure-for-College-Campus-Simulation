import AlertPrioritizationDashboard from '@/components/alerts/AlertPrioritizationDashboard'

export default function PriorityAlertsPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-lg font-semibold text-white">Priority Alerts</div>
        <div className="text-sm text-white/60">Urgency-based queue across grid, health, maintenance and occupancy</div>
      </div>

      <AlertPrioritizationDashboard />
    </div>
  )
}

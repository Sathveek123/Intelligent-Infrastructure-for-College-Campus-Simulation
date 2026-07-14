import CapacityPlanner from '@/components/planning/CapacityPlanner'

export default function CapacityPlanningPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-lg font-semibold text-white">Capacity Planning</div>
        <div className="text-sm text-white/60">What-if analysis for student intake and infrastructure requirements</div>
      </div>

      <CapacityPlanner />
    </div>
  )
}

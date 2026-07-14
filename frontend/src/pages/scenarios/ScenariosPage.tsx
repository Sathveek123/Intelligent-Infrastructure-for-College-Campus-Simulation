import ScenarioManager from '@/components/scenarios/ScenarioManager'

export default function ScenariosPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-lg font-semibold text-white">Scenarios</div>
        <div className="text-sm text-white/60">Save and load reusable campus configurations</div>
      </div>

      <ScenarioManager />
    </div>
  )
}

import BuildingComparison from '@/components/comparison/BuildingComparison'

export default function BuildingComparisonPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-lg font-semibold text-white">Building Comparison</div>
        <div className="text-sm text-white/60">Side-by-side analysis across key building metrics</div>
      </div>

      <BuildingComparison />
    </div>
  )
}

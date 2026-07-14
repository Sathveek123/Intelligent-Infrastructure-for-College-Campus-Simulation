import PerformanceBenchmarksDashboard from '@/components/benchmarks/PerformanceBenchmarksDashboard'

export default function BenchmarksPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-lg font-semibold text-white">Benchmarks</div>
        <div className="text-sm text-white/60">Compare current performance against optimal targets</div>
      </div>

      <PerformanceBenchmarksDashboard />
    </div>
  )
}

import AdminPowerControl from '@/components/admin/AdminPowerControl'

export default function PowerControlPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-lg font-semibold text-white">Power Control</div>
        <div className="text-sm text-white/60">Admin controls for electricity supply per building</div>
      </div>

      <AdminPowerControl />
    </div>
  )
}

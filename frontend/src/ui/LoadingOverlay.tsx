type Props = {
  message?: string
}

export default function LoadingOverlay({ message = 'Loading…' }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.55)] backdrop-blur">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/15 border-b-brand-400" />
        <div className="text-sm font-semibold text-white/80">{message}</div>
      </div>
    </div>
  )
}

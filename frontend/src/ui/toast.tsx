import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react'
import clsx from 'clsx'

type ToastTone = 'success' | 'error' | 'info'

type ToastItem = {
  id: string
  title: string
  message?: string
  tone: ToastTone
}

type ToastContextValue = {
  push: (t: Omit<ToastItem, 'id'>) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const push = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const item: ToastItem = { id, ...t }

    setToasts((prev) => [item, ...prev].slice(0, 4))

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id))
    }, 3200)
  }, [])

  const value = useMemo(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              'w-[340px] max-w-[85vw] rounded-2xl border p-4 shadow-lg backdrop-blur',
              t.tone === 'success' && 'border-emerald-200 bg-emerald-50',
              t.tone === 'error' && 'border-red-200 bg-red-50',
              t.tone === 'info' && 'border-slate-200 bg-white',
            )}
          >
            <div className="text-sm font-semibold text-slate-900">{t.title}</div>
            {t.message ? <div className="mt-1 text-sm text-slate-600">{t.message}</div> : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

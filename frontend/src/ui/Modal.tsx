import { X } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'

type Props = {
  open?: boolean
  isOpen?: boolean
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  onClose: () => void
}

export default function Modal({ open, isOpen, title, description, children, footer, size = 'md', onClose }: Props) {
  const resolvedOpen = open ?? isOpen ?? false
  const [visible, setVisible] = useState(false)

  const maxWidth = useMemo(() => {
    if (size === 'sm') return 'max-w-sm'
    if (size === 'md') return 'max-w-xl'
    if (size === 'lg') return 'max-w-2xl'
    return 'max-w-4xl'
  }, [size])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    if (!resolvedOpen) return

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    document.addEventListener('keydown', onKeyDown)
    const raf = window.requestAnimationFrame(() => setVisible(true))
    return () => {
      window.cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
      setVisible(false)
    }
  }, [resolvedOpen, onClose])

  function closeWithAnimation() {
    setVisible(false)
    window.setTimeout(() => onClose(), 180)
  }

  if (!resolvedOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={clsx(
          'absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-200',
          visible ? 'opacity-100' : 'opacity-0',
        )}
        onClick={closeWithAnimation}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className={clsx(
            'w-full rounded-3xl border border-white/10 bg-slate-950/70 shadow-[0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur transition-all duration-200',
            maxWidth,
            visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-white/10 p-6">
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-white">{title}</div>
              {description ? <div className="mt-1 text-sm text-white/60">{description}</div> : null}
            </div>
            <button
              type="button"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10"
              aria-label="Close"
              onClick={closeWithAnimation}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[70vh] overflow-auto p-6">{children}</div>

          {footer ? (
            <div className="flex items-center justify-end gap-2 border-t border-white/10 p-5">{footer}</div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

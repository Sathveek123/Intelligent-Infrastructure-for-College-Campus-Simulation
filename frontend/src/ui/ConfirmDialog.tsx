import { AlertTriangle, HelpCircle } from 'lucide-react'
import Button from '@/ui/Button'
import Modal from '@/ui/Modal'

type Props = {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'info'
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'info',
}: Props) {
  const icon = variant === 'info' ? HelpCircle : AlertTriangle
  const Icon = icon

  return (
    <Modal
      isOpen={isOpen}
      title={title}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-white">
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-sm text-white/70">{message}</div>
      </div>
    </Modal>
  )
}

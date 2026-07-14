import clsx from 'clsx'
import type React from 'react'

type Props = React.InputHTMLAttributes<HTMLInputElement>

export default function Input({ className, ...props }: Props) {
  return (
    <input
      className={clsx(
        'w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none transition placeholder:opacity-100 placeholder:text-white/40 focus:border-brand-400/80 focus:ring-2 focus:ring-brand-500/20',
        className,
      )}
      {...props}
    />
  )
}

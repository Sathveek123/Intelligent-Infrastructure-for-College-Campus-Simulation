import { type ReactNode, useState } from 'react'

type Props = {
  content: string
  children: ReactNode
}

export function Tooltip({ content, children }: Props) {
  const [show, setShow] = useState(false)

  return (
    <div className="relative inline-block">
      <div onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
        {children}
      </div>
      {show ? (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-3 py-2 text-xs text-white shadow-lg">
          {content}
          <div className="absolute left-1/2 top-full -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-slate-900" />
          </div>
        </div>
      ) : null}
    </div>
  )
}

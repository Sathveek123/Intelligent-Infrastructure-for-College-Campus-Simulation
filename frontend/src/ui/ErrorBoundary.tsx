import React from 'react'
import Button from '@/ui/Button'

type Props = {
  children: React.ReactNode
}

type State = {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error) {
    console.error('UI error boundary caught error:', error)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <div className="text-lg font-semibold text-slate-900">Something went wrong</div>
          <div className="mt-2 text-sm text-slate-600">The app hit an unexpected error. Try reloading. If it keeps happening, check the console logs.</div>

          {this.state.error ? (
            <pre className="mt-4 max-h-40 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              {this.state.error.message}
            </pre>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              onClick={() => {
                window.location.reload()
              }}
            >
              Reload
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                this.setState({ hasError: false, error: undefined })
              }}
            >
              Try to recover
            </Button>
          </div>
        </div>
      </div>
    )
  }
}

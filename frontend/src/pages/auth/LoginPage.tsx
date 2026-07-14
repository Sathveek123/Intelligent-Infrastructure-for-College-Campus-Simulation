import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { useAuth } from '@/context/auth'
import Button from '@/ui/Button'
import Input from '@/ui/Input'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState('admin@gmrit.edu.in')
  const [password, setPassword] = useState('admin123')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await login({ email, password })
      navigate('/app/dashboard')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 h-screen w-screen overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0">
          <img
            src="/images/Landing.png"
            alt="Campus background"
            className="h-full w-full object-cover opacity-100"
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-white/10" />
        <div className="absolute inset-0 bg-brand-500/10" />
        <div className="absolute inset-0 backdrop-blur-[1px]" />
      </div>

      <div className="relative mx-auto flex h-full w-full max-w-2xl flex-col justify-center px-4">
        <div className="rounded-[32px] border border-white/35 bg-white/10 p-10 shadow-[0_24px_90px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-white ring-1 ring-white/10">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white">Intelligent Infrastructure Simulation</div>
              <div className="text-xs text-white/60">Sign in to continue</div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/40 p-3">
            <div className="text-xs text-white/60">GMR Campus</div>
            <img
              src="/images/GMR LOGO.png"
              alt="GMR Logo"
              className="h-8 w-auto"
              onError={(e) => {
                ;(e.currentTarget as HTMLImageElement).style.display = 'none'
              }}
            />
          </div>

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="text-xs font-semibold text-white/80">Email</label>
              <div className="mt-1">
                <Input
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@college.edu"
                  className="login-input rounded-2xl border-white/35 bg-white/95 px-4 py-3 text-base !text-slate-900 caret-slate-900 leading-[1.2] placeholder:opacity-100 placeholder:text-slate-600 focus:border-brand-400 focus:ring-brand-200"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-white/80">Password</label>
              <div className="mt-1">
                <Input
                  type="password"
                  autoComplete="current-password"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="login-input rounded-2xl border-white/35 bg-white/95 px-4 py-3 text-base !text-slate-900 caret-slate-900 leading-[1.2] placeholder:opacity-100 placeholder:text-slate-600 focus:border-brand-400 focus:ring-brand-200"
                />
              </div>
            </div>

            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Login'}
            </Button>

            <div className="text-xs text-white/50">
              Admin: admin@gmrit.edu.in / admin123 · Staff: staff@gmrit.edu.in / staff123
            </div>
          </form>
        </div>

        <div className="mt-6 text-center text-xs text-white/40">
          <a className="hover:text-white/70" href="/">← Back to landing</a>
        </div>
      </div>
    </div>
  )
}

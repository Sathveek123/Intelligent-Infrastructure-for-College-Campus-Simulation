import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowRight, BarChart3, Brain, Building2, Clock, Database, Github, Linkedin, Lock, Network, Play, Shield, Sparkles, Users, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '@/ui/Button'
import clsx from 'clsx'

function useInView<T extends HTMLElement>(options?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setInView(true)
      },
      { threshold: 0.2, ...options },
    )

    obs.observe(el)
    return () => obs.disconnect()
  }, [options])

  return { ref, inView }
}

type NavItem = { label: string; href: string }

const NAV: NavItem[] = [
  { label: 'Platform', href: '#platform' },
  { label: 'Features', href: '#features' },
  { label: 'Technology', href: '#technology' },
  { label: 'Demo', href: '#demo' },
  { label: 'Contact', href: '#contact' },
]

function LandingHeader() {
  const [solid, setSolid] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setSolid(window.scrollY > 24)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={clsx(
        'fixed inset-x-0 top-0 z-30 transition-all',
        solid ? 'border-b border-white/10 bg-slate-950/80 backdrop-blur' : 'bg-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link
          to="/"
          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition hover:bg-white/10"
        >
          <img
            src="/images/GMR LOGO.png"
            alt="GMR Logo"
            className="h-9 w-auto"
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
          />
          <div className="leading-tight">
            <div className="text-sm font-semibold text-white">Intelligent Infrastructure Simulation Framework</div>
            <div className="text-[11px] text-white/60">GMR Campus</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="text-sm text-white/80 transition hover:text-white">
              {n.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/login">
            <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
              Login
            </Button>
          </Link>
          <Link to="/login">
            <Button className="hidden md:inline-flex">
              Explore
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  const [stageIdx, setStageIdx] = useState(0)
  const [metrics, setMetrics] = useState([
    { label: 'Health Score', value: 78, color: 'bg-emerald-500' },
    { label: 'Energy Efficiency', value: 62, color: 'bg-blue-500' },
    { label: 'Occupancy Efficiency', value: 71, color: 'bg-purple-500' },
  ])
  const [prediction, setPrediction] = useState({
    severity: 'High',
    message: 'HVAC efficiency drop + sustained high utilization',
    confidence: 82,
    etaDays: 7,
  })

  useEffect(() => {
    const stages = ['Simulation → Metrics → Predictions', 'Metrics → Predictions → Alerts', 'Predictions → Alerts → Reports']

    const predictions = [
      { severity: 'High', message: 'HVAC efficiency drop + sustained high utilization', confidence: 82, etaDays: 7 },
      { severity: 'Medium', message: 'Water pump vibration anomaly detected in Hostel C', confidence: 74, etaDays: 10 },
      { severity: 'High', message: 'Lab equipment load spike pattern detected (Block A)', confidence: 79, etaDays: 5 },
    ] as const

    const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

    function tweenTo(next: number[], duration = 900) {
      const start = performance.now()
      const from = metrics.map((m) => m.value)

      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / duration)
        const ease = 1 - Math.pow(1 - p, 3)
        setMetrics((prev) =>
          prev.map((m, idx) => {
            const v = Math.round(from[idx] + (next[idx] - from[idx]) * ease)
            return { ...m, value: v }
          }),
        )
        if (p < 1) requestAnimationFrame(tick)
      }

      requestAnimationFrame(tick)
    }

    const interval = window.setInterval(() => {
      setStageIdx((i) => (i + 1) % stages.length)

      const nextA = clamp(76 + Math.round((Math.random() - 0.5) * 6), 68, 92)
      const nextB = clamp(61 + Math.round((Math.random() - 0.5) * 8), 45, 88)
      const nextC = clamp(70 + Math.round((Math.random() - 0.5) * 6), 55, 90)
      tweenTo([nextA, nextB, nextC])

      const p = predictions[Math.floor(Math.random() * predictions.length)]
      setPrediction({ ...p })
    }, 3600)

    return () => window.clearInterval(interval)
  }, [metrics])

  const stageLabel = useMemo(() => {
    const stages = ['Simulation → Metrics → Predictions', 'Metrics → Predictions → Alerts', 'Predictions → Alerts → Reports']
    return stages[stageIdx] ?? stages[0]
  }, [stageIdx])

  return (
    <section className="relative min-h-screen overflow-hidden bg-slate-950 pt-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="landing-grid absolute inset-0 opacity-40" />
        <div className="landing-orb landing-orb-1" />
        <div className="landing-orb landing-orb-2" />
        <div className="landing-orb landing-orb-3" />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-24 pt-24 md:grid-cols-12 md:items-center md:pb-36">
        <div className="md:col-span-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-semibold text-white/80">
            <Sparkles className="h-4 w-4 text-purple-300" />
            AI-driven campus infrastructure intelligence
          </div>

          <h1 className="mt-7 text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
            Building intelligence for campus infrastructure
          </h1>

          <p className="mt-6 max-w-2xl text-xl leading-relaxed text-white/70 sm:text-2xl">
            Predictive analytics, real-time monitoring, and simulation-powered decisions for smarter, safer, and more efficient
            campus operations.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link to="/login">
              <Button className="px-6 py-3 text-base">
                Explore the platform
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#demo">
              <Button variant="outline" className="border-white/15 bg-white/5 px-6 py-3 text-base text-white hover:bg-white/10">
                View demo
              </Button>
            </a>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { k: '24/7', v: 'Monitoring' },
              { k: '85%', v: 'Prediction accuracy' },
              { k: '40%', v: 'Cost reduction' },
              { k: '30%', v: 'Energy savings' },
            ].map((s) => (
              <div key={s.v} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-2xl font-semibold text-white">{s.k}</div>
                <div className="text-sm text-white/60">{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-5">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_10px_50px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-white">Live System Preview</div>
              <div className="text-xs text-white/60 landing-progress">{stageLabel}</div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
                  <div className="flex items-center justify-between">
                    <div className="text-base text-white/80">System bus</div>
                    <div className="text-xs text-white/60">Live activity</div>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="relative h-20 w-12 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                      <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-brand-500/35 to-transparent" />
                      <div className="absolute inset-0">
                        <div className="absolute left-1.5 top-2 h-3 w-9 rounded-full bg-emerald-400/30 landing-progress" />
                        <div className="absolute left-1.5 top-8 h-3 w-9 rounded-full bg-blue-400/30 landing-progress" style={{ animationDelay: '0.6s' }} />
                        <div className="absolute left-1.5 top-14 h-3 w-9 rounded-full bg-purple-400/30 landing-progress" style={{ animationDelay: '1.2s' }} />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-white">Streaming telemetry</div>
                      <div className="mt-1 text-xs text-white/60">Events arrive in order: occupancy, energy, maintenance, simulation</div>
                    </div>
                  </div>
                </div>

                {metrics.map((m) => (
                  <div key={m.label} className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
                    <div className="flex items-center justify-between text-base text-white/80">
                      <span>{m.label}</span>
                      <span className="font-semibold text-white tabular-nums">{m.value}%</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white/10">
                      <div className={clsx('h-2 rounded-full landing-progress', m.color)} style={{ width: `${m.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
                <div className="flex items-center justify-between text-base text-white/80">
                  <span>Next predicted maintenance</span>
                  <span
                    className={clsx(
                      'rounded-full px-2 py-0.5 text-xs font-semibold',
                      prediction.severity === 'High'
                        ? 'bg-orange-500/15 text-orange-200'
                        : prediction.severity === 'Medium'
                          ? 'bg-yellow-500/15 text-yellow-200'
                          : 'bg-emerald-500/15 text-emerald-200',
                    )}
                  >
                    {prediction.severity}
                  </span>
                </div>
                <div className="mt-2 text-sm text-white/60">{prediction.message}</div>
                <div className="mt-3 text-xs text-white/50">Confidence: {prediction.confidence}% • ETA: {prediction.etaDays} days</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <a href="#platform" className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/70 hover:text-white">
        <div className="grid place-items-center gap-2">
          <div className="text-xs">Scroll</div>
          <ArrowDown className="h-5 w-5 landing-bounce" />
        </div>
      </a>
    </section>
  )
}

function CenterStatement() {
  const { ref, inView } = useInView<HTMLDivElement>()
  return (
    <section id="platform" className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <div
          ref={ref}
          className={clsx(
            'mx-auto max-w-3xl text-center transition-all duration-700',
            inView ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
          )}
        >
          <div className="text-sm font-semibold text-brand-700">Mission</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            From reactive maintenance to intelligent, predictive operations
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            We believe campus infrastructure should be intelligent, predictive, and autonomous. Traditional management is
            reactive. We make it proactive.
          </p>
          <div className="mt-6 text-sm text-slate-500">Built for the future of educational facilities.</div>
        </div>
      </div>
    </section>
  )
}

function ProblemStatement() {
  const { ref, inView } = useInView<HTMLDivElement>()

  const stats = useMemo(
    () => [
      { k: '30%', v: 'energy waste in inefficient buildings' },
      { k: '2×', v: 'higher costs from emergency repairs' },
      { k: '24/7', v: 'operational blindspots without monitoring' },
      { k: '0', v: 'insight when data is missing' },
    ],
    [],
  )

  return (
    <section className="bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <div
          ref={ref}
          className={clsx(
            'grid gap-10 md:grid-cols-12 transition-all duration-700',
            inView ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
          )}
        >
          <div className="md:col-span-6">
            <div className="text-sm font-semibold text-purple-200">The Challenge</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Campus management today is:</h2>
            <div className="mt-5 space-y-3 text-white/70">
              {[
                'Manual and time-consuming',
                'Reactive, not predictive',
                'Data-poor and inefficient',
                'Costly due to unexpected failures',
              ].map((t) => (
                <div key={t} className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                  <div>{t}</div>
                </div>
              ))}
            </div>
            <div className="mt-6 text-sm text-white/60">
              Result: wasted resources, operational blindspots, and reactive maintenance.
            </div>
          </div>

          <div className="md:col-span-6">
            <div className="grid grid-cols-2 gap-4">
              {stats.map((s) => (
                <div key={s.v} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-2xl font-semibold text-white">{s.k}</div>
                  <div className="mt-1 text-sm text-white/60">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

type Feature = {
  title: string
  body: string
  bullets: string[]
  accent: 'blue' | 'purple' | 'emerald' | 'orange'
  icon: React.ComponentType<{ className?: string }>
}

const FEATURES: Feature[] = [
  {
    title: 'Real-time building intelligence',
    body: 'Monitor every building, room, and system in real time. Track occupancy, energy consumption, and equipment health across your entire campus from a single dashboard.',
    bullets: ['Live occupancy tracking', 'Energy consumption analytics', 'Infrastructure health metrics', 'Automated alerts'],
    accent: 'blue',
    icon: BarChart3,
  },
  {
    title: 'AI-powered predictions',
    body: "Don't wait for failures. Predict them. Our engine analyzes patterns, trends, and stress signals to forecast maintenance needs before problems occur.",
    bullets: ['Predictive maintenance alerts', 'Building health scoring', 'Infrastructure stress analysis', 'Automated recommendations'],
    accent: 'purple',
    icon: Brain,
  },
  {
    title: 'What-if simulations',
    body: "Test infrastructure capacity before it's tested by reality. Simulate occupancy loads, energy demands, and stress scenarios to plan confidently.",
    bullets: ['Occupancy simulations', 'Energy load testing', 'Stress tests', 'Capacity planning tools'],
    accent: 'emerald',
    icon: Zap,
  },
  {
    title: 'Proactive decision support',
    body: 'The system learns from every simulation and reading. It identifies patterns, predicts failures, and helps you create maintenance schedules with confidence scores.',
    bullets: ['Confidence-scored predictions', 'Automated scheduling', 'Trend analysis', 'Anomaly detection'],
    accent: 'orange',
    icon: Clock,
  },
]

function FeatureRow({ feature, flip }: { feature: Feature; flip?: boolean }) {
  const { ref, inView } = useInView<HTMLDivElement>()

  const imageByTitle: Record<string, string> = {
    'Real-time building intelligence': '/images/landing-page-1.jpg',
    'AI-powered predictions': '/images/areoplane.jpg',
    'What-if simulations': '/images/facilities.jpg',
    'Proactive decision support': '/images/Landing.png',
  }

  const heroImage = imageByTitle[feature.title] ?? '/images/Landing.png'

  const accent = {
    blue: 'from-brand-600/20 to-purple-600/10',
    purple: 'from-purple-600/20 to-brand-600/10',
    emerald: 'from-emerald-600/20 to-brand-600/10',
    orange: 'from-orange-600/20 to-purple-600/10',
  }[feature.accent]

  const Icon = feature.icon

  return (
    <div
      ref={ref}
      className={clsx(
        'grid items-center gap-8 md:grid-cols-12 transition-all duration-700',
        inView ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
      )}
    >
      <div className={clsx('md:col-span-6', flip ? 'md:order-2' : 'md:order-1')}>
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white">
            <Icon className="h-5 w-5" />
          </div>
          <h3 className="text-2xl font-semibold tracking-tight text-slate-900">{feature.title}</h3>
        </div>

        <p className="mt-4 text-lg leading-relaxed text-slate-600">{feature.body}</p>

        <div className="mt-5 grid gap-2 text-sm text-slate-700">
          {feature.bullets.map((b) => (
            <div key={b} className="flex items-start gap-3">
              <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" />
              <div>{b}</div>
            </div>
          ))}
        </div>
      </div>

      <div className={clsx('md:col-span-6', flip ? 'md:order-1' : 'md:order-2')}>
        <div className={clsx('rounded-3xl border border-slate-200 bg-gradient-to-br p-6 shadow-card', accent)}>
          <div className="rounded-2xl border border-white/10 bg-slate-950/90 p-5 text-white">
            <div className="text-sm font-semibold text-white/90">Visual Preview</div>
            <div className="mt-1 text-xs text-white/60">Campus visuals (project assets)</div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <img
                src={heroImage}
                alt="Campus preview"
                className="h-56 w-full object-cover md:h-64"
                onError={(e) => {
                  ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                }}
              />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-white/70">Signals</div>
                <div className="mt-2 h-2 rounded-full bg-white/10" />
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-white/70">Simulation</div>
                <div className="mt-2 h-2 rounded-full bg-white/10" />
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-white/70">Actions</div>
                <div className="mt-2 h-2 rounded-full bg-white/10" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeaturesSection() {
  return (
    <section id="features" className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <div className="max-w-2xl">
          <div className="text-sm font-semibold text-brand-700">Core capabilities</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            A platform built for intelligent campus operations
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Designed to support facilities teams, planners, and administrators with real-time clarity and predictive
            action.
          </p>
        </div>

        <div className="mt-12 space-y-14">
          {FEATURES.map((f, idx) => (
            <FeatureRow key={f.title} feature={f} flip={idx % 2 === 1} />
          ))}
        </div>
      </div>
    </section>
  )
}

const TECH = [
  { icon: Brain, title: 'Intelligent algorithms', desc: 'Models analyze patterns across thousands of data points to generate accurate predictions.' },
  { icon: Zap, title: 'Real-time processing', desc: 'Live ingestion and processing for instant insights and immediate alerts.' },
  { icon: Shield, title: 'Enterprise security', desc: 'Role-based access, audit logs, and secure storage for institutional compliance.' },
  { icon: BarChart3, title: 'Temporal analytics', desc: 'Historical tracking and trend analysis reveal evolution and predict future risk.' },
  { icon: Clock, title: 'Automated workflows', desc: 'Scheduled jobs handle metrics, predictions, and snapshots without manual work.' },
  { icon: Database, title: 'Scalable architecture', desc: 'A clean 3-tier design that scales from single campus to multi-campus deployments.' },
]

function TechStack() {
  const { ref, inView } = useInView<HTMLDivElement>()

  return (
    <section id="technology" className="bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <div
          ref={ref}
          className={clsx(
            'transition-all duration-700',
            inView ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
          )}
        >
          <div className="text-sm font-semibold text-brand-700">Technology</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Built on modern foundations</h2>
          <p className="mt-4 max-w-2xl text-lg text-slate-600">
            Engineered for reliability, observability, and rapid iteration in real campus environments.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TECH.map((t) => {
              const Icon = t.icon
              return (
                <div key={t.title} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-1">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100 transition group-hover:bg-brand-100">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="text-sm font-semibold text-slate-900">{t.title}</div>
                  </div>
                  <div className="mt-3 text-sm leading-relaxed text-slate-600">{t.desc}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

const USE_CASES = [
  { icon: Building2, title: 'Facilities managers', desc: 'Reduce emergency repairs with predictive maintenance and health scoring.' },
  { icon: Zap, title: 'Energy managers', desc: 'Cut energy waste with real-time consumption tracking and optimization.' },
  { icon: Network, title: 'Campus planners', desc: 'Make expansion decisions using simulation scenarios and stress testing.' },
  { icon: Database, title: 'Finance directors', desc: 'Lower operational costs through preventive planning and efficiency insights.' },
  { icon: Users, title: 'Students & faculty', desc: 'Experience better facilities with fewer disruptions and safer spaces.' },
  { icon: Shield, title: 'IT administrators', desc: 'Centralized monitoring with secure access controls and audit trails.' },
]

function UseCases() {
  const { ref, inView } = useInView<HTMLDivElement>()

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <div
          ref={ref}
          className={clsx(
            'transition-all duration-700',
            inView ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
          )}
        >
          <div className="text-sm font-semibold text-brand-700">Use cases</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Who benefits?</h2>
          <p className="mt-4 max-w-2xl text-lg text-slate-600">Built for the real people who keep campuses running.</p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {USE_CASES.map((c) => {
              const Icon = c.icon
              return (
                <div key={c.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-1">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="text-sm font-semibold text-slate-900">{c.title}</div>
                  </div>
                  <div className="mt-3 text-sm leading-relaxed text-slate-600">{c.desc}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

function DemoPreview() {
  const { ref, inView } = useInView<HTMLDivElement>()

  return (
    <section id="demo" className="bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <div
          ref={ref}
          className={clsx(
            'grid gap-10 md:grid-cols-12 transition-all duration-700',
            inView ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
          )}
        >
          <div className="md:col-span-5">
            <div className="text-sm font-semibold text-purple-200">See it in action</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Live demo preview</h2>
            <p className="mt-4 text-lg leading-relaxed text-white/70">
              Watch how administrators use dashboards, run simulations, and respond to predictive alerts.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/login">
                <Button>
                  Request full demo
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#contact">
                <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
                  Contact
                </Button>
              </a>
            </div>
          </div>

          <div className="md:col-span-7">
            <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-2">
              <div className="relative grid aspect-video place-items-center rounded-2xl bg-gradient-to-br from-brand-600/20 via-purple-600/20 to-slate-950">
                <div className="grid place-items-center rounded-full border border-white/15 bg-white/10 p-4 text-white transition group-hover:scale-105">
                  <Play className="h-6 w-6" />
                </div>
                <div className="absolute bottom-4 left-4 rounded-full border border-white/10 bg-slate-950/50 px-3 py-1 text-xs font-semibold text-white/80">
                  Replace with a GIF/video later
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Architecture() {
  const { ref, inView } = useInView<HTMLDivElement>()

  return (
    <section className="bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <div
          ref={ref}
          className={clsx(
            'transition-all duration-700',
            inView ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
          )}
        >
          <div className="text-sm font-semibold text-brand-700">System architecture</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">How it works</h2>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { title: 'Data sources', desc: 'Buildings, rooms, simulations, users' },
                { title: 'Processing', desc: 'Real-time + historical analytics' },
                { title: 'Intelligence', desc: 'Health scoring + predictions' },
                { title: 'Actions', desc: 'Alerts, scheduling, exports' },
              ].map((s) => (
                <div key={s.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">{s.title}</div>
                  <div className="mt-2 text-sm text-slate-600">{s.desc}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-center gap-3 text-sm text-slate-500">
              <div className="h-px w-12 bg-slate-200" />
              Data Collection → Simulation Engine → Predictive Analysis → Automated Actions
              <div className="h-px w-12 bg-slate-200" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function SecuritySection() {
  const { ref, inView } = useInView<HTMLDivElement>()

  const items = [
    { icon: Lock, title: 'Data encryption', desc: 'Encrypted at rest and in transit using standard practices.' },
    { icon: Shield, title: 'Role-based access', desc: 'Granular permissions keep data limited to the right roles.' },
    { icon: Clock, title: 'Audit trails', desc: 'Complete logging for compliance and incident review.' },
    { icon: BarChart3, title: 'Operational reporting', desc: 'Exports + history for stakeholders and governance.' },
  ]

  return (
    <section className="bg-slate-950" id="contact">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <div
          ref={ref}
          className={clsx(
            'transition-all duration-700',
            inView ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
          )}
        >
          <div className="text-sm font-semibold text-purple-200">Security & compliance</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Enterprise-ready from day one</h2>
          <p className="mt-4 max-w-2xl text-lg text-white/70">Built with the safeguards institutions expect.</p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((i) => {
              const Icon = i.icon
              return (
                <div key={i.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="mt-3 text-sm font-semibold text-white">{i.title}</div>
                  <div className="mt-2 text-sm leading-relaxed text-white/60">{i.desc}</div>
                </div>
              )
            })}
          </div>

          <div className="mt-12 rounded-3xl border border-white/10 bg-gradient-to-br from-brand-600/20 via-purple-600/20 to-slate-950 p-8">
            <div className="text-2xl font-semibold text-white sm:text-3xl">Ready to build smarter infrastructure?</div>
            <div className="mt-3 max-w-2xl text-white/70">
              Transform your campus management from reactive to proactive with AI-driven infrastructure intelligence.
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/login">
                <Button>
                  Get started today
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#features">
                <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
                  Explore features
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
              <img
                src="/images/GMR LOGO.png"
                alt="GMR Logo"
                className="h-9 w-auto"
                onError={(e) => {
                  ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                }}
              />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white">Intelligent Infrastructure Simulation Framework</div>
                <div className="text-xs text-white/60">GMR Campus • Training Tomorrow’s Engineers Today</div>
              </div>
            </div>
          </div>

          <div className="md:col-span-8">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="text-xs font-semibold text-white/80">Platform</div>
                <div className="mt-3 grid gap-2 text-sm text-white/60">
                  <a href="#features" className="hover:text-white">Features</a>
                  <a href="#technology" className="hover:text-white">Technology</a>
                  <a href="#demo" className="hover:text-white">Demo</a>
                  <Link to="/login" className="hover:text-white">Login</Link>
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-white/80">Resources</div>
                <div className="mt-3 grid gap-2 text-sm text-white/60">
                  <a href="#platform" className="hover:text-white">Overview</a>
                  <a href="#contact" className="hover:text-white">Security</a>
                  <a href="/status" className="hover:text-white">System status</a>
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-white/80">Company</div>
                <div className="mt-3 grid gap-2 text-sm text-white/60">
                  <a href="#platform" className="hover:text-white">About</a>
                  <a href="#contact" className="hover:text-white">Contact</a>
                  <a href="#demo" className="hover:text-white">Request demo</a>
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-white/80">Social</div>
                <div className="mt-3 flex items-center gap-3 text-white/60">
                  <a className="hover:text-white" href="#" aria-label="GitHub">
                    <Github className="h-5 w-5" />
                  </a>
                  <a className="hover:text-white" href="#" aria-label="LinkedIn">
                    <Linkedin className="h-5 w-5" />
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-10 border-t border-white/10 pt-6 text-xs text-white/50">
              © {new Date().getFullYear()} InfraIntel. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <LandingHeader />
      <Hero />
      <CenterStatement />
      <ProblemStatement />
      <FeaturesSection />
      <TechStack />
      <UseCases />
      <DemoPreview />
      <Architecture />
      <SecuritySection />
      <Footer />
    </div>
  )
}

import { useMemo, useState } from 'react'
import Button from '@/ui/Button'
import Input from '@/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/Card'
import { useToast } from '@/ui/toast'

export default function SettingsPage() {
  const { push } = useToast()

  const SYSTEM_SETTINGS_KEY = 'i2sf_system_settings_v1'
  const tabs = useMemo(
    () => [
      { key: 'profile', label: 'Profile Settings' },
      { key: 'system', label: 'System Configuration' },
      { key: 'notifications', label: 'Notification Preferences' },
      { key: 'appearance', label: 'Appearance' },
    ] as const,
    [],
  )

  type TabKey = (typeof tabs)[number]['key']
  const [tab, setTab] = useState<TabKey>('profile')

  const [profile, setProfile] = useState({ name: 'Campus Admin', email: 'admin@college.edu', password: '', newPassword: '' })
  const [system, setSystem] = useState(() => {
    const fallback = { perStudentEnergyFactor: 0.35, baseLoadMultiplier: 1.0, usageHoursLimit: 400, occupancyAlertThreshold: 75 }
    const raw = localStorage.getItem(SYSTEM_SETTINGS_KEY)
    if (!raw) return fallback
    try {
      const parsed = JSON.parse(raw) as Partial<typeof fallback>
      return {
        perStudentEnergyFactor: typeof parsed.perStudentEnergyFactor === 'number' ? parsed.perStudentEnergyFactor : fallback.perStudentEnergyFactor,
        baseLoadMultiplier: typeof parsed.baseLoadMultiplier === 'number' ? parsed.baseLoadMultiplier : fallback.baseLoadMultiplier,
        usageHoursLimit: typeof parsed.usageHoursLimit === 'number' ? parsed.usageHoursLimit : fallback.usageHoursLimit,
        occupancyAlertThreshold: typeof parsed.occupancyAlertThreshold === 'number' ? parsed.occupancyAlertThreshold : fallback.occupancyAlertThreshold,
      }
    } catch {
      return fallback
    }
  })
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    maintenanceAlerts: true,
    energyThresholdAlerts: true,
    reportNotifications: true,
  })
  const [appearance, setAppearance] = useState({ theme: 'light', density: 'comfortable' })

  const LOCAL_DB_KEYS = {
    buildings: 'i2sf_buildings_v1',
    rooms: 'i2sf_rooms_v1',
    users: 'i2sf_users_v1',
    maintenance: 'i2sf_maintenance_v1',
    seedSource: 'i2sf_seed_source_v1',
    simulationRuns: 'i2sf_simulation_runs_v1',
    dismissedPredictions: 'i2sf_dismissed_predictions_v1',
    authToken: 'i2sf_token',
    authUser: 'i2sf_user',
    authRefreshToken: 'i2sf_refresh_token',
  } as const

  function downloadJson(filename: string, value: unknown) {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  function exportLocalDb() {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      storage: Object.fromEntries(Object.entries(LOCAL_DB_KEYS).map(([k, v]) => [k, localStorage.getItem(v)])),
    }
    downloadJson(`gmr_i2sf_localdb_${new Date().toISOString().slice(0, 10)}.json`, payload)
    push({ tone: 'success', title: 'Exported', message: 'Downloaded local DB JSON.' })
  }

  async function importLocalDb(file: File) {
    const text = await file.text()
    const parsed = JSON.parse(text) as { storage?: Record<string, string | null> }
    const storage = parsed.storage ?? {}

    for (const [k, key] of Object.entries(LOCAL_DB_KEYS)) {
      if (!(k in storage)) continue
      const value = storage[k]
      if (value == null) localStorage.removeItem(key)
      else localStorage.setItem(key, value)
    }

    push({ tone: 'success', title: 'Imported', message: 'Local DB imported. Refresh the page to reload data.' })
  }

  function resetToDbJsonSeed() {
    localStorage.removeItem(LOCAL_DB_KEYS.buildings)
    localStorage.removeItem(LOCAL_DB_KEYS.rooms)
    localStorage.removeItem(LOCAL_DB_KEYS.users)
    localStorage.removeItem(LOCAL_DB_KEYS.maintenance)
    localStorage.removeItem(LOCAL_DB_KEYS.seedSource)
    push({ tone: 'success', title: 'Reset complete', message: 'Local storage cleared. Refresh to re-seed from db.json.' })
  }

  function saveCurrent() {
    if (tab === 'system') {
      localStorage.setItem(SYSTEM_SETTINGS_KEY, JSON.stringify(system))
    }
    push({ tone: 'success', title: 'Settings saved', message: `Saved ${tabs.find((t) => t.key === tab)?.label ?? ''}` })
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-lg font-semibold text-white">Settings</div>
        <div className="text-sm text-white/60">UI-only settings (ready for backend integration)</div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={
              t.key === tab
                ? 'rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white'
                : 'rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10'
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-white/80">Profile Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-white/70">Name</label>
                <div className="mt-1">
                  <Input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-white/70">Email</label>
                <div className="mt-1">
                  <Input value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-white/70">Current password</label>
                <div className="mt-1">
                  <Input type="password" value={profile.password} onChange={(e) => setProfile((p) => ({ ...p, password: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-white/70">New password</label>
                <div className="mt-1">
                  <Input type="password" value={profile.newPassword} onChange={(e) => setProfile((p) => ({ ...p, newPassword: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end">
              <Button onClick={saveCurrent}>Save</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {tab === 'system' ? (
        <Card>
          <CardHeader>
            <CardTitle>System Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-white/70">Per student energy factor</label>
                <div className="mt-1">
                  <Input
                    type="number"
                    step="0.01"
                    value={system.perStudentEnergyFactor}
                    onChange={(e) => setSystem((s) => ({ ...s, perStudentEnergyFactor: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-white/70">Base load multiplier</label>
                <div className="mt-1">
                  <Input
                    type="number"
                    step="0.01"
                    value={system.baseLoadMultiplier}
                    onChange={(e) => setSystem((s) => ({ ...s, baseLoadMultiplier: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-white/70">Maintenance threshold (usage hours)</label>
                <div className="mt-1">
                  <Input
                    type="number"
                    value={system.usageHoursLimit}
                    onChange={(e) => setSystem((s) => ({ ...s, usageHoursLimit: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-white/70">Occupancy alert threshold (%)</label>
                <div className="mt-1">
                  <Input
                    type="number"
                    value={system.occupancyAlertThreshold}
                    onChange={(e) => setSystem((s) => ({ ...s, occupancyAlertThreshold: Number(e.target.value) }))}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end">
              <Button onClick={saveCurrent}>Save</Button>
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="text-sm font-semibold text-white">Local DB (Option 1)</div>
              <div className="mt-1 text-xs text-white/60">Export/import campus data + simulation history (stored in localStorage).</div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={exportLocalDb}>
                  Export JSON
                </Button>
                <label className="inline-flex cursor-pointer items-center">
                  <input
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.currentTarget.files?.[0]
                      if (!file) return
                      void importLocalDb(file)
                      e.currentTarget.value = ''
                    }}
                  />
                  <span className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10">Import JSON</span>
                </label>
                <Button variant="outline" onClick={resetToDbJsonSeed}>
                  Reset to db.json
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {tab === 'notifications' ? (
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <div className="text-sm font-semibold text-white">Email notifications</div>
                <div className="mt-2">
                  <select
                    className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/20"
                    value={notifications.emailNotifications ? 'on' : 'off'}
                    onChange={(e) => setNotifications((n) => ({ ...n, emailNotifications: e.target.value === 'on' }))}
                  >
                    <option value="on">On</option>
                    <option value="off">Off</option>
                  </select>
                </div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <div className="text-sm font-semibold text-white">Maintenance alerts</div>
                <div className="mt-2">
                  <select
                    className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/20"
                    value={notifications.maintenanceAlerts ? 'on' : 'off'}
                    onChange={(e) => setNotifications((n) => ({ ...n, maintenanceAlerts: e.target.value === 'on' }))}
                  >
                    <option value="on">On</option>
                    <option value="off">Off</option>
                  </select>
                </div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <div className="text-sm font-semibold text-white">Energy threshold alerts</div>
                <div className="mt-2">
                  <select
                    className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/20"
                    value={notifications.energyThresholdAlerts ? 'on' : 'off'}
                    onChange={(e) => setNotifications((n) => ({ ...n, energyThresholdAlerts: e.target.value === 'on' }))}
                  >
                    <option value="on">On</option>
                    <option value="off">Off</option>
                  </select>
                </div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <div className="text-sm font-semibold text-white">Report generation notifications</div>
                <div className="mt-2">
                  <select
                    className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/20"
                    value={notifications.reportNotifications ? 'on' : 'off'}
                    onChange={(e) => setNotifications((n) => ({ ...n, reportNotifications: e.target.value === 'on' }))}
                  >
                    <option value="on">On</option>
                    <option value="off">Off</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end">
              <Button onClick={saveCurrent}>Save</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {tab === 'appearance' ? (
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-white/70">Theme</label>
                <div className="mt-1">
                  <select
                    className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/20"
                    value={appearance.theme}
                    onChange={(e) => setAppearance((a) => ({ ...a, theme: e.target.value }))}
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark (placeholder)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-white/70">View density</label>
                <div className="mt-1">
                  <select
                    className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/20"
                    value={appearance.density}
                    onChange={(e) => setAppearance((a) => ({ ...a, density: e.target.value }))}
                  >
                    <option value="compact">Compact</option>
                    <option value="comfortable">Comfortable</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end">
              <Button onClick={saveCurrent}>Save</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

export interface Scenario {
  id: string
  name: string
  description: string
  createdAt: string
  tags: string[]
  snapshot: Record<string, string | null>
}

const SCENARIOS_KEY = 'i2sf_scenarios_v1'

const SNAPSHOT_KEYS = [
  'i2sf_buildings_v1',
  'i2sf_rooms_v1',
  'i2sf_users_v1',
  'i2sf_maintenance_v1',
  'i2sf_power_grid_v1',
  'i2sf_grid_alerts_v1',
  'i2sf_building_aging_v1',
  'i2sf_campus_events_v1',
  'i2sf_building_dependencies_v1',
  'i2sf_overflow_history_v1',
  'i2sf_recommendations_v1',
  'i2sf_virtual_time_v1',
  'i2sf_campus_mode_v1',
  'i2sf_system_settings_v1',
  'i2sf_simulation_runs_v1',
  'i2sf_dismissed_predictions_v1',
] as const

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export class ScenarioService {
  public getAllScenarios(): Scenario[] {
    const list = safeParse<Scenario[]>(localStorage.getItem(SCENARIOS_KEY), [])
    return list
      .slice()
      .filter((s) => s && s.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  public saveCurrentScenario(args: { name: string; description: string; tags: string[] }): Scenario {
    const now = new Date().toISOString()
    const scenario: Scenario = {
      id: `scenario_${Date.now()}`,
      name: args.name,
      description: args.description,
      createdAt: now,
      tags: args.tags,
      snapshot: Object.fromEntries(SNAPSHOT_KEYS.map((k) => [k, localStorage.getItem(k)])),
    }

    const list = this.getAllScenarios()
    const next = [scenario, ...list]
    localStorage.setItem(SCENARIOS_KEY, JSON.stringify(next))
    return scenario
  }

  public loadScenario(id: string): void {
    const list = this.getAllScenarios()
    const scenario = list.find((s) => s.id === id)
    if (!scenario) throw new Error('Scenario not found')

    for (const k of SNAPSHOT_KEYS) {
      const value = scenario.snapshot[k]
      if (value == null) localStorage.removeItem(k)
      else localStorage.setItem(k, value)
    }

    window.location.reload()
  }

  public deleteScenario(id: string): void {
    const list = this.getAllScenarios().filter((s) => s.id !== id)
    localStorage.setItem(SCENARIOS_KEY, JSON.stringify(list))
  }
}

export const scenarioService = new ScenarioService()

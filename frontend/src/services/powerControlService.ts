export type BuildingPowerControl = {
  buildingId: string
  // Multiplies building.baseEnergyLoad before occupancy/time/event multipliers.
  loadMultiplier: number
  // If set, caps the computed load (kW) for the building.
  supplyLimitKw: number | null
}

const KEY = 'i2sf_building_power_controls_v1'

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export class PowerControlService {
  public getAll(): Record<string, BuildingPowerControl> {
    return safeParse<Record<string, BuildingPowerControl>>(localStorage.getItem(KEY), {})
  }

  public get(buildingId: string): BuildingPowerControl {
    const all = this.getAll()
    const existing = all[buildingId]
    if (existing) return existing
    return { buildingId, loadMultiplier: 1, supplyLimitKw: null }
  }

  public set(control: BuildingPowerControl): void {
    const all = this.getAll()
    all[control.buildingId] = {
      buildingId: control.buildingId,
      loadMultiplier: clamp(control.loadMultiplier, 0.2, 3),
      supplyLimitKw: control.supplyLimitKw == null ? null : Math.max(0, Math.round(control.supplyLimitKw)),
    }
    localStorage.setItem(KEY, JSON.stringify(all))
  }

  public reset(buildingId: string): void {
    const all = this.getAll()
    delete all[buildingId]
    localStorage.setItem(KEY, JSON.stringify(all))
  }

  public resetAll(): void {
    localStorage.removeItem(KEY)
  }
}

export const powerControlService = new PowerControlService()

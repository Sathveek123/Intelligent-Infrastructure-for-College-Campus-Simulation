const DEMO_MODE_KEY = 'i2sf_demo_mode_v1'
const DEMO_SPEED_KEY = 'i2sf_demo_speed_v1'

export class DemoModeService {
  public enableDemoMode(speed: number = 10): void {
    localStorage.setItem(DEMO_MODE_KEY, '1')
    localStorage.setItem(DEMO_SPEED_KEY, String(this.sanitizeSpeed(speed)))
  }

  public disableDemoMode(): void {
    localStorage.removeItem(DEMO_MODE_KEY)
    localStorage.removeItem(DEMO_SPEED_KEY)
  }

  public isDemoEnabled(): boolean {
    return localStorage.getItem(DEMO_MODE_KEY) === '1'
  }

  public getSpeedMultiplier(): number {
    const raw = localStorage.getItem(DEMO_SPEED_KEY)
    const n = raw ? Number(raw) : 1
    return this.sanitizeSpeed(n)
  }

  public setSpeedMultiplier(speed: number): void {
    if (!this.isDemoEnabled()) return
    localStorage.setItem(DEMO_SPEED_KEY, String(this.sanitizeSpeed(speed)))
  }

  private sanitizeSpeed(speed: number): number {
    if (!Number.isFinite(speed)) return 1
    return Math.max(1, Math.min(20, Math.round(speed)))
  }
}

export const demoModeService = new DemoModeService()

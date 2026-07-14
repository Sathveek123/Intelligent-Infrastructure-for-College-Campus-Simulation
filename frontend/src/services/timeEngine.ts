import type {
  CampusMode,
  CampusModeConfig,
  DayType,
  TimeMultipliers,
  TimeSlot,
  TimeSlotConfig,
  VirtualTime,
} from '@/types/timeModel'

const VIRTUAL_TIME_KEY = 'i2sf_virtual_time_v1'
const CAMPUS_MODE_KEY = 'i2sf_campus_mode_v1'
const TIMER_GUARD_KEY = '__i2sf_time_engine_interval__'
const DEMO_MODE_KEY = 'i2sf_demo_mode_v1'
const DEMO_SPEED_KEY = 'i2sf_demo_speed_v1'

const TIME_SLOT_CONFIGS: TimeSlotConfig[] = [
  {
    slot: 'morning',
    hours: [8, 12],
    defaultOccupancy: 85,
    energyFactor: 1.2,
    acUsage: 0.8,
    labActivity: 0.9,
  },
  {
    slot: 'afternoon',
    hours: [12, 17],
    defaultOccupancy: 70,
    energyFactor: 1.0,
    acUsage: 1.0,
    labActivity: 0.7,
  },
  {
    slot: 'evening',
    hours: [17, 21],
    defaultOccupancy: 40,
    energyFactor: 0.7,
    acUsage: 0.6,
    labActivity: 0.3,
  },
  {
    slot: 'night',
    hours: [21, 8],
    defaultOccupancy: 10,
    energyFactor: 0.3,
    acUsage: 0.2,
    labActivity: 0.1,
  },
]

const CAMPUS_MODE_CONFIGS: Record<CampusMode, CampusModeConfig> = {
  regular: {
    mode: 'regular',
    occupancyAdjustment: 1.0,
    energyAdjustment: 1.0,
    description: 'Normal academic operations',
    typical: ['Regular classes', 'Lab sessions', 'Library access'],
  },
  exam: {
    mode: 'exam',
    occupancyAdjustment: 0.6,
    energyAdjustment: 1.1,
    description: 'Examination period',
    typical: ['Exam halls active', 'Library crowded', 'Labs closed'],
  },
  event: {
    mode: 'event',
    occupancyAdjustment: 1.3,
    energyAdjustment: 1.4,
    description: 'Campus event in progress',
    typical: ['Technical fest', 'Cultural event', 'Guest lectures'],
  },
  vacation: {
    mode: 'vacation',
    occupancyAdjustment: 0.2,
    energyAdjustment: 0.4,
    description: 'Vacation period',
    typical: ['Minimal staff', 'Closed facilities', 'Hostel maintenance'],
  },
  maintenance: {
    mode: 'maintenance',
    occupancyAdjustment: 0.3,
    energyAdjustment: 0.5,
    description: 'Infrastructure maintenance',
    typical: ['Building repairs', 'Equipment upgrade', 'Cleaning operations'],
  },
}

function safeParseVirtualTime(raw: string): VirtualTime | null {
  try {
    const parsed = JSON.parse(raw) as any
    if (!parsed) return null
    const date = new Date(parsed.currentDate)
    if (Number.isNaN(date.getTime())) return null
    return {
      ...parsed,
      currentDate: date,
    } as VirtualTime
  } catch {
    return null
  }
}

export class TimeEngine {
  private virtualTime: VirtualTime
  private listeners: Set<(time: VirtualTime) => void> = new Set()
  private lastTickAt: number

  constructor() {
    this.virtualTime = this.loadVirtualTime()
    this.lastTickAt = Date.now()
    this.startTimeCycle()
  }

  private isDemoEnabled() {
    return localStorage.getItem(DEMO_MODE_KEY) === '1'
  }

  private getDemoSpeed() {
    const raw = localStorage.getItem(DEMO_SPEED_KEY)
    const n = raw ? Number(raw) : 1
    if (!Number.isFinite(n)) return 1
    return Math.max(1, Math.min(20, Math.round(n)))
  }

  private loadVirtualTime(): VirtualTime {
    const saved = localStorage.getItem(VIRTUAL_TIME_KEY)
    if (saved) {
      const vt = safeParseVirtualTime(saved)
      if (vt) return vt
    }
    return this.getCurrentVirtualTime()
  }

  private saveVirtualTime(): void {
    localStorage.setItem(VIRTUAL_TIME_KEY, JSON.stringify(this.virtualTime))
  }

  private getCurrentVirtualTime(): VirtualTime {
    const now = new Date()
    const hour = now.getHours()

    return {
      currentDate: now,
      currentHour: hour,
      timeSlot: this.getTimeSlot(hour),
      dayType: this.getDayType(now),
      campusMode: this.getCampusMode(),
      academicWeek: this.getAcademicWeek(now),
      isExamWeek: this.isExamWeek(),
    }
  }

  private getTimeSlot(hour: number): TimeSlot {
    if (hour >= 8 && hour < 12) return 'morning'
    if (hour >= 12 && hour < 17) return 'afternoon'
    if (hour >= 17 && hour < 21) return 'evening'
    return 'night'
  }

  private getDayType(date: Date): DayType {
    const day = date.getDay()
    if (day === 0 || day === 6) return 'weekend'
    return 'weekday'
  }

  private getCampusMode(): CampusMode {
    const saved = localStorage.getItem(CAMPUS_MODE_KEY)
    const mode = (saved as CampusMode) || 'regular'
    return CAMPUS_MODE_CONFIGS[mode] ? mode : 'regular'
  }

  private getAcademicWeek(date: Date): number {
    const semesterStart = new Date(date.getFullYear(), 6, 1)
    const diff = date.getTime() - semesterStart.getTime()
    const week = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1
    return Math.max(1, Math.min(16, week))
  }

  private isExamWeek(): boolean {
    return this.getCampusMode() === 'exam'
  }

  private startTimeCycle(): void {
    const w = window as any
    if (w[TIMER_GUARD_KEY]) return

    const id = window.setInterval(() => {
      const now = Date.now()
      const dtMs = Math.max(0, now - this.lastTickAt)
      this.lastTickAt = now

      if (this.isDemoEnabled()) {
        // Advance virtual time faster: 1 real second * speed => N virtual seconds.
        const speed = this.getDemoSpeed()
        const advanceMs = dtMs * speed
        const nextDate = new Date(this.virtualTime.currentDate)
        nextDate.setTime(nextDate.getTime() + advanceMs)

        this.virtualTime = {
          currentDate: nextDate,
          currentHour: nextDate.getHours(),
          timeSlot: this.getTimeSlot(nextDate.getHours()),
          dayType: this.getDayType(nextDate),
          campusMode: this.virtualTime.campusMode,
          academicWeek: this.getAcademicWeek(nextDate),
          isExamWeek: this.virtualTime.campusMode === 'exam',
        }
      } else {
        // Normal behavior: sync to real time.
        this.virtualTime = this.getCurrentVirtualTime()
      }

      this.saveVirtualTime()
      this.notifyListeners()
    }, 1000)

    w[TIMER_GUARD_KEY] = id
  }

  public getVirtualTime(): VirtualTime {
    return this.virtualTime
  }

  public syncToNow(): void {
    this.virtualTime = this.getCurrentVirtualTime()
    this.lastTickAt = Date.now()
    this.saveVirtualTime()
    this.notifyListeners()
  }

  public setCampusMode(mode: CampusMode): void {
    localStorage.setItem(CAMPUS_MODE_KEY, mode)
    this.virtualTime.campusMode = mode
    this.virtualTime.isExamWeek = mode === 'exam'
    this.saveVirtualTime()
    this.notifyListeners()
  }

  public getTimeMultipliers(): TimeMultipliers {
    const slotConfig = TIME_SLOT_CONFIGS.find((config) => config.slot === this.virtualTime.timeSlot) ?? TIME_SLOT_CONFIGS[0]
    const modeConfig = CAMPUS_MODE_CONFIGS[this.virtualTime.campusMode]
    const weekendFactor = this.virtualTime.dayType === 'weekend' ? 0.3 : 1.0

    return {
      occupancyMultiplier: (slotConfig.defaultOccupancy / 100) * modeConfig.occupancyAdjustment * weekendFactor,
      energyMultiplier: slotConfig.energyFactor * modeConfig.energyAdjustment * weekendFactor,
      acLoadMultiplier: slotConfig.acUsage * modeConfig.energyAdjustment,
      labUsageMultiplier: slotConfig.labActivity * modeConfig.occupancyAdjustment,
    }
  }

  public subscribe(listener: (time: VirtualTime) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.virtualTime))
  }

  public getTimeSlotConfig(): TimeSlotConfig {
    return TIME_SLOT_CONFIGS.find((config) => config.slot === this.virtualTime.timeSlot) ?? TIME_SLOT_CONFIGS[0]
  }

  public getCampusModeConfig(): CampusModeConfig {
    return CAMPUS_MODE_CONFIGS[this.virtualTime.campusMode]
  }

  public advanceTime(hours: number): void {
    const newDate = new Date(this.virtualTime.currentDate)
    newDate.setHours(newDate.getHours() + hours)

    this.virtualTime = {
      currentDate: newDate,
      currentHour: newDate.getHours(),
      timeSlot: this.getTimeSlot(newDate.getHours()),
      dayType: this.getDayType(newDate),
      campusMode: this.virtualTime.campusMode,
      academicWeek: this.getAcademicWeek(newDate),
      isExamWeek: this.virtualTime.campusMode === 'exam',
    }

    this.saveVirtualTime()
    this.notifyListeners()
  }
}

export const timeEngine = new TimeEngine()
export { TIME_SLOT_CONFIGS, CAMPUS_MODE_CONFIGS }

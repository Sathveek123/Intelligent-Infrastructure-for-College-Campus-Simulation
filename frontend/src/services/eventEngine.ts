import type { CampusEvent, EventImpactResult, EventType } from '@/types/eventModel'
import type { Building } from '@/types'

const STORAGE_KEY = 'i2sf_campus_events_v1'

const EVENT_TEMPLATES: Record<EventType, { occupancy: number; energy: number; ac: number; lighting: number }> = {
  technical_fest: { occupancy: 1.4, energy: 1.5, ac: 1.3, lighting: 1.6 },
  cultural_fest: { occupancy: 1.5, energy: 1.4, ac: 1.2, lighting: 1.8 },
  placement_drive: { occupancy: 0.8, energy: 1.1, ac: 1.2, lighting: 1.0 },
  workshop: { occupancy: 0.6, energy: 1.2, ac: 1.1, lighting: 1.1 },
  seminar: { occupancy: 0.7, energy: 1.0, ac: 1.0, lighting: 1.1 },
  sports_event: { occupancy: 1.3, energy: 0.8, ac: 0.7, lighting: 1.2 },
  exam: { occupancy: 0.9, energy: 1.1, ac: 1.0, lighting: 1.0 },
  conference: { occupancy: 1.2, energy: 1.3, ac: 1.4, lighting: 1.2 },
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function parseEvents(raw: string): CampusEvent[] {
  try {
    const arr = JSON.parse(raw) as any[]
    if (!Array.isArray(arr)) return []
    return arr.map((e) => ({
      ...e,
      startDate: new Date(e.startDate),
      endDate: new Date(e.endDate),
      createdAt: new Date(e.createdAt),
    })) as CampusEvent[]
  } catch {
    return []
  }
}

export class EventEngine {
  private events: CampusEvent[] = []

  constructor() {
    this.loadEvents()
    this.seedDefaultsIfEmpty()
  }

  private loadEvents() {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) this.events = parseEvents(saved)
  }

  private saveEvents() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.events))
  }

  private seedDefaultsIfEmpty() {
    if (this.events.length) return
    const now = new Date()
    const start = new Date(now)
    start.setDate(start.getDate() + 1)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)

    this.events = [
      {
        id: `event_${Date.now()}`,
        name: 'Campus Workshop',
        type: 'workshop',
        startDate: start,
        endDate: end,
        startTime: '10:00',
        endTime: '16:00',
        buildingsAffected: [],
        expectedAttendance: 450,
        description: 'Hands-on workshop with increased lab utilization',
        impact: 'medium',
        loadMultipliers: EVENT_TEMPLATES.workshop,
        active: true,
        createdAt: new Date(),
      },
    ]
    this.saveEvents()
  }

  public getAllEvents() {
    return [...this.events]
  }

  public getActiveEvents(now = new Date()) {
    return this.events.filter((e) => {
      if (!e.active) return false
      return now >= new Date(e.startDate) && now <= new Date(e.endDate)
    })
  }

  public getUpcomingEvents(days = 7, now = new Date()) {
    const future = new Date(now)
    future.setDate(future.getDate() + days)

    return this.events.filter((e) => {
      const start = new Date(e.startDate)
      return start > now && start <= future
    })
  }

  public createEvent(input: Omit<CampusEvent, 'id' | 'createdAt'>) {
    const event: CampusEvent = { ...input, id: `event_${Date.now()}`, createdAt: new Date() }
    this.events = [event, ...this.events]
    this.saveEvents()
    return event
  }

  public updateEvent(id: string, updates: Partial<CampusEvent>) {
    this.events = this.events.map((e) => (e.id === id ? { ...e, ...updates } : e))
    this.saveEvents()
  }

  public deleteEvent(id: string) {
    this.events = this.events.filter((e) => e.id !== id)
    this.saveEvents()
  }

  public getEventTemplate(type: EventType) {
    return EVENT_TEMPLATES[type] ?? EVENT_TEMPLATES.seminar
  }

  private calcStress(occupancy: number, capacity: number) {
    const rate = (occupancy / Math.max(1, capacity)) * 100
    if (rate > 90) return 3
    if (rate > 70) return 2
    return 1
  }

  public calculateEventImpact(event: CampusEvent, building: Building): EventImpactResult {
    const normalOccupancy = building.totalRooms ? Math.round((building.totalRooms * 40 * (building.occupancyRate ?? 0)) / 100) : 0
    const normalEnergy = building.baseEnergyLoad ?? 0

    const eventOccupancy = Math.round(normalOccupancy * event.loadMultipliers.occupancy)
    const eventEnergy = Math.round(normalEnergy * event.loadMultipliers.energy)

    const normalStress = this.calcStress(normalOccupancy, (building.totalRooms ?? 1) * 40)
    const eventStress = this.calcStress(eventOccupancy, (building.totalRooms ?? 1) * 40)

    const stressIncrease = eventStress - normalStress

    const rec: string[] = []
    if (stressIncrease > 0) rec.push('High stress expected. Consider opening overflow rooms.')
    if (event.loadMultipliers.energy > 1.3) rec.push('Energy will spike. Prepare backup power / load scheduling.')
    if (event.loadMultipliers.ac > 1.2) rec.push('AC load spike. Pre-cool spaces 1 hour early.')

    return {
      eventId: event.id,
      eventName: event.name,
      buildingId: building.id,
      buildingName: building.buildingName,
      normalOccupancy,
      eventOccupancy,
      normalEnergy,
      eventEnergy,
      stressIncrease,
      recommendations: rec,
    }
  }

  public getGlobalLoadMultipliers(now = new Date()) {
    const active = this.getActiveEvents(now)
    if (!active.length) return { occupancy: 1, energy: 1, ac: 1, lighting: 1 }

    // combine by taking the max multiplier across active events (simple but stable)
    return active.reduce(
      (acc, e) => ({
        occupancy: Math.max(acc.occupancy, e.loadMultipliers.occupancy),
        energy: Math.max(acc.energy, e.loadMultipliers.energy),
        ac: Math.max(acc.ac, e.loadMultipliers.ac),
        lighting: Math.max(acc.lighting, e.loadMultipliers.lighting),
      }),
      { occupancy: 1, energy: 1, ac: 1, lighting: 1 },
    )
  }

  public quickCreateFromTemplate(args: { name: string; type: EventType; startDate: string; endDate: string; startTime: string; endTime: string; expectedAttendance: number; description: string }) {
    const template = this.getEventTemplate(args.type)
    const impact =
      args.expectedAttendance > 2000 ? 'critical' : args.expectedAttendance > 1000 ? 'high' : args.expectedAttendance > 500 ? 'medium' : 'low'

    return this.createEvent({
      name: args.name,
      type: args.type,
      startDate: new Date(args.startDate),
      endDate: new Date(args.endDate),
      startTime: args.startTime,
      endTime: args.endTime,
      buildingsAffected: [],
      expectedAttendance: clamp(args.expectedAttendance, 1, 100000),
      description: args.description,
      impact,
      loadMultipliers: template,
      active: true,
    })
  }
}

export const eventEngine = new EventEngine()

import type { Building, MaintenanceRecord, Room, User } from '@/types'

const STORAGE_KEYS = {
  buildings: 'i2sf_buildings_v1',
  rooms: 'i2sf_rooms_v1',
  users: 'i2sf_users_v1',
  maintenance: 'i2sf_maintenance_v1',
  seedSource: 'i2sf_seed_source_v1',
}

function delay(ms = 500) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms))
}

function maybeThrow() {
  // Intentionally disabled in local-DB mode to avoid intermittent "Failed to load" UX.
}

function readJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

function seedFallback() {
  const buildings = readJson<Building[] | null>(STORAGE_KEYS.buildings, null)
  const rooms = readJson<Room[] | null>(STORAGE_KEYS.rooms, null)
  const users = readJson<User[] | null>(STORAGE_KEYS.users, null)
  const maintenance = readJson<MaintenanceRecord[] | null>(STORAGE_KEYS.maintenance, null)

  if (!buildings) {
    writeJson<Building[]>(STORAGE_KEYS.buildings, [
      {
        id: 'b1',
        buildingName: 'Block A',
        buildingCode: 'ACA-A',
        totalFloors: 4,
        totalRooms: 52,
        constructionYear: 2012,
        buildingType: 'academic',
        baseEnergyLoad: 120,
        occupancyRate: 72,
      },
      {
        id: 'b2',
        buildingName: 'Admin Wing',
        buildingCode: 'ADM-1',
        totalFloors: 2,
        totalRooms: 18,
        constructionYear: 2008,
        buildingType: 'administrative',
        baseEnergyLoad: 65,
        occupancyRate: 44,
      },
      {
        id: 'b3',
        buildingName: 'Hostel C',
        buildingCode: 'HOS-C',
        totalFloors: 6,
        totalRooms: 96,
        constructionYear: 2016,
        buildingType: 'hostel',
        baseEnergyLoad: 150,
        occupancyRate: 81,
      },
    ])
  }

  if (!rooms) {
    writeJson<Room[]>(STORAGE_KEYS.rooms, [
      {
        id: 'r1',
        buildingId: 'b1',
        buildingName: 'Block A',
        roomNumber: 'A-101',
        floor: 1,
        capacity: 60,
        roomType: 'classroom',
        status: 'occupied',
        utilizationRate: 86,
      },
      {
        id: 'r2',
        buildingId: 'b1',
        buildingName: 'Block A',
        roomNumber: 'A-204',
        floor: 2,
        capacity: 40,
        roomType: 'lab',
        status: 'available',
        utilizationRate: 22,
      },
    ])
  }

  if (!users) {
    const now = new Date().toISOString()
    writeJson<User[]>(STORAGE_KEYS.users, [
      { id: 'u1', name: 'Campus Admin', email: 'admin@college.edu', role: 'admin', isActive: true, createdAt: now },
      { id: 'u2', name: 'Staff Member', email: 'staff@college.edu', role: 'staff', isActive: true, createdAt: now },
      { id: 'u3', name: 'Old Staff', email: 'oldstaff@college.edu', role: 'staff', isActive: false, createdAt: now },
    ])
  }

  if (!maintenance) {
    const now = new Date().toISOString()
    const d = new Date(now)
    const datePlusDays = (days: number) => {
      const x = new Date(d)
      x.setDate(x.getDate() + days)
      return x.toISOString().slice(0, 10)
    }
    writeJson<MaintenanceRecord[]>(STORAGE_KEYS.maintenance, [
      {
        id: 'm1',
        type: 'building',
        targetId: 'b1',
        targetName: 'Block A',
        maintenanceDate: now.slice(0, 10),
        issueDescription: 'HVAC performance degradation detected',
        priority: 'critical',
        status: 'pending',
        cost: 12000,
        createdBy: 'Campus Admin',
      },
      {
        id: 'm2',
        type: 'room',
        targetId: 'r2',
        targetName: 'A-204',
        maintenanceDate: now.slice(0, 10),
        issueDescription: 'Lab equipment calibration required',
        priority: 'high',
        status: 'in_progress',
        cost: 3500,
        createdBy: 'Staff Member',
      },
      {
        id: 'm3',
        type: 'building',
        targetId: 'b3',
        targetName: 'Hostel C',
        maintenanceDate: datePlusDays(2),
        issueDescription: 'Water pump pressure fluctuation observed',
        priority: 'high',
        status: 'pending',
        cost: 4800,
        createdBy: 'Campus Admin',
      },
      {
        id: 'm4',
        type: 'building',
        targetId: 'b2',
        targetName: 'Admin Wing',
        maintenanceDate: datePlusDays(4),
        issueDescription: 'UPS battery health below threshold',
        priority: 'medium',
        status: 'pending',
        cost: 6200,
        createdBy: 'Staff Member',
      },
      {
        id: 'm5',
        type: 'room',
        targetId: 'r1',
        targetName: 'A-101',
        maintenanceDate: datePlusDays(-3),
        issueDescription: 'Projector lamp nearing end-of-life',
        priority: 'medium',
        status: 'completed',
        cost: 2200,
        createdBy: 'Staff Member',
      },
    ])
  }
}

type CollegeDb = {
  institution?: { name?: string; shortName?: string }
  infrastructure?: {
    academicBlocks?: Array<any>
    centralFacilities?: Array<any>
    centralWorkshops?: Array<any>
    hostels?: { boys?: Array<any>; girls?: Array<any> }
  }
}

let seeded = false
let seedingPromise: Promise<void> | null = null

function normalizeBuildingType(value: unknown): Building['buildingType'] {
  const v = typeof value === 'string' ? value.toLowerCase() : ''
  if (v.includes('hostel')) return 'hostel'
  if (v.includes('lab') || v.includes('workshop')) return 'laboratory'
  if (v.includes('admin')) return 'administrative'
  return 'academic'
}

function safeNumber(v: unknown, fallback = 0) {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function safeString(v: unknown, fallback = '') {
  return typeof v === 'string' ? v : fallback
}

function toFloorCount(raw: any): number {
  const n = safeNumber(raw?.structure?.totalFloors ?? raw?.totalFloors, 1)
  return Math.max(1, Math.round(n))
}

function toTotalRooms(raw: any): number {
  const direct = safeNumber(raw?.rooms?.totalRooms ?? raw?.totalRooms ?? raw?.plannedRooms?.totalRooms ?? raw?.plannedRooms?.totalPlannedCapacity, 0)
  if (direct) return Math.max(0, Math.round(direct))
  const classroomCount = safeNumber(raw?.rooms?.classrooms?.count, 0)
  const labCount = safeNumber(raw?.rooms?.labs?.count, 0)
  const facultyCount = safeNumber(raw?.rooms?.facultyRooms?.count, 0)
  return Math.max(0, Math.round(classroomCount + labCount + facultyCount))
}

function buildRoomId(buildingId: string, suffix: string) {
  return `${buildingId}-${suffix}`
}

function generateRoomsForBuilding(building: Building, raw: any): Room[] {
  const floorCount = Math.max(1, building.totalFloors)
  const rooms: Room[] = []

  const classroomCount = safeNumber(raw?.rooms?.classrooms?.count ?? raw?.plannedRooms?.classrooms?.count, 0)
  const classroomAvgCapacity = safeNumber(raw?.rooms?.classrooms?.averageCapacity, 60)
  for (let i = 0; i < classroomCount; i++) {
    const floor = Math.min(floorCount, Math.floor(i / 10) + 1)
    rooms.push({
      id: buildRoomId(building.id, `CR-${i + 1}`),
      buildingId: building.id,
      buildingName: building.buildingName,
      roomNumber: `${building.buildingCode}-CR-${String(i + 1).padStart(2, '0')}`,
      floor,
      capacity: classroomAvgCapacity,
      roomType: 'classroom',
      status: 'available',
      utilizationRate: typeof building.occupancyRate === 'number' ? building.occupancyRate : undefined,
    })
  }

  const labTypes: any[] = Array.isArray(raw?.rooms?.labs?.types) ? raw.rooms.labs.types : []
  for (let i = 0; i < labTypes.length; i++) {
    const lab = labTypes[i]
    const floor = Math.min(floorCount, Math.floor((classroomCount + i) / 10) + 1)
    const equipment = [safeString(lab?.equipment), Array.isArray(lab?.software) ? lab.software.join(', ') : ''].filter(Boolean).join(' • ')
    rooms.push({
      id: buildRoomId(building.id, `LAB-${i + 1}`),
      buildingId: building.id,
      buildingName: building.buildingName,
      roomNumber: `${building.buildingCode}-LAB-${String(i + 1).padStart(2, '0')}`,
      floor,
      capacity: Math.max(1, Math.round(safeNumber(lab?.capacity, 40))),
      roomType: 'lab',
      equipmentList: equipment || undefined,
      status: 'available',
      utilizationRate: typeof building.occupancyRate === 'number' ? building.occupancyRate : undefined,
    })
  }

  const hostelRooms = safeNumber(raw?.rooms?.studentRooms?.totalRooms, 0)
  for (let i = 0; i < hostelRooms; i++) {
    const floor = Math.min(floorCount, Math.floor(i / 20) + 1)
    rooms.push({
      id: buildRoomId(building.id, `H-${i + 1}`),
      buildingId: building.id,
      buildingName: building.buildingName,
      roomNumber: `${building.buildingCode}-${String(i + 1).padStart(3, '0')}`,
      floor,
      capacity: 3,
      roomType: 'hostel_room',
      status: 'available',
    })
  }

  const officeCount = Array.isArray(raw?.offices) ? raw.offices.length : 0
  for (let i = 0; i < officeCount; i++) {
    const office = raw.offices[i]
    const floor = Math.min(floorCount, Math.max(1, Math.round(safeNumber(office?.floor, 1))))
    rooms.push({
      id: buildRoomId(building.id, `OFF-${i + 1}`),
      buildingId: building.id,
      buildingName: building.buildingName,
      roomNumber: `${building.buildingCode}-OFF-${String(i + 1).padStart(2, '0')}`,
      floor,
      capacity: Math.max(1, Math.round(safeNumber(office?.capacity ?? office?.occupancy, 4))),
      roomType: 'office',
      status: 'available',
    })
  }

  return rooms
}

async function seedFromCollegeDb() {
  const res = await fetch('/db.json', { cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed to fetch db.json (${res.status})`)
  const db = (await res.json()) as CollegeDb

  const academicBlocks = Array.isArray(db.infrastructure?.academicBlocks) ? db.infrastructure?.academicBlocks : []
  const centralFacilities = Array.isArray(db.infrastructure?.centralFacilities) ? db.infrastructure?.centralFacilities : []
  const centralWorkshops = Array.isArray(db.infrastructure?.centralWorkshops) ? db.infrastructure?.centralWorkshops : []
  const boysHostels = Array.isArray(db.infrastructure?.hostels?.boys) ? db.infrastructure?.hostels?.boys : []
  const girlsHostels = Array.isArray(db.infrastructure?.hostels?.girls) ? db.infrastructure?.hostels?.girls : []

  const allUnits = [...academicBlocks, ...centralFacilities, ...centralWorkshops, ...boysHostels, ...girlsHostels]

  const buildings: Building[] = []
  const rooms: Room[] = []

  for (const unit of allUnits) {
    const id = safeString(unit?.id, '')
    const name = safeString(unit?.blockName ?? unit?.facilityName ?? unit?.hostelName ?? unit?.workshopName, '')
    const code = safeString(unit?.blockCode ?? unit?.facilityCode ?? unit?.hostelCode ?? unit?.workshopCode, '')
    if (!id || !name || !code) continue

    const building: Building = {
      id,
      buildingName: name,
      buildingCode: code,
      totalFloors: toFloorCount(unit),
      totalRooms: toTotalRooms(unit),
      constructionYear: Math.max(1900, Math.round(safeNumber(unit?.constructionYear, new Date().getFullYear()))),
      buildingType: normalizeBuildingType(unit?.type ?? unit?.buildingType ?? unit?.facilityType ?? unit?.workshopType),
      baseEnergyLoad: Math.max(0, Math.round(safeNumber(unit?.energyProfile?.baseEnergyLoad, 0))),
      occupancyRate: safeNumber(unit?.occupancy?.overallOccupancyPercent ?? unit?.capacity?.occupancyPercent ?? unit?.occupancy?.currentOccupancyPercent, undefined as any),
    }
    buildings.push(building)
    rooms.push(...generateRoomsForBuilding(building, unit))
  }

  const now = new Date().toISOString()
  const users: User[] = [
    { id: 'u1', name: 'Campus Admin', email: 'admin@college.edu', role: 'admin', isActive: true, createdAt: now },
    { id: 'u2', name: 'Staff Member', email: 'staff@college.edu', role: 'staff', isActive: true, createdAt: now },
  ]

  const maintenance: MaintenanceRecord[] = []

  writeJson(STORAGE_KEYS.buildings, buildings)
  writeJson(STORAGE_KEYS.rooms, rooms)
  writeJson(STORAGE_KEYS.users, users)
  writeJson(STORAGE_KEYS.maintenance, maintenance)
  writeJson(STORAGE_KEYS.seedSource, 'college_db_json_v1')
}

async function ensureSeeded() {
  if (seeded) return
  if (!seedingPromise) {
    seedingPromise = (async () => {
      try {
        const src = readJson<string | null>(STORAGE_KEYS.seedSource, null)
        if (src !== 'college_db_json_v1') {
          await seedFromCollegeDb()
        }
      } catch {
        seedFallback()
      } finally {
        seeded = true
      }
    })()
  }
  await seedingPromise
}

export async function fetchBuildings(): Promise<Building[]> {
  await ensureSeeded()
  await delay(500)
  maybeThrow()
  return readJson<Building[]>(STORAGE_KEYS.buildings, [])
}

export async function addBuilding(data: Omit<Building, 'id'>): Promise<Building> {
  await ensureSeeded()
  await delay(500)
  maybeThrow()
  const items = readJson<Building[]>(STORAGE_KEYS.buildings, [])
  const id = `b${Math.random().toString(16).slice(2, 10)}`
  const next: Building = { ...data, id }
  writeJson(STORAGE_KEYS.buildings, [next, ...items])
  return next
}

export async function updateBuilding(id: string, patch: Partial<Building>): Promise<Building> {
  await ensureSeeded()
  await delay(500)
  maybeThrow()
  const items = readJson<Building[]>(STORAGE_KEYS.buildings, [])
  const idx = items.findIndex((b) => b.id === id)
  if (idx < 0) throw new Error('Building not found')
  const updated = { ...items[idx], ...patch }
  const next = items.slice()
  next[idx] = updated
  writeJson(STORAGE_KEYS.buildings, next)
  return updated
}

export async function deleteBuilding(id: string): Promise<void> {
  await ensureSeeded()
  await delay(500)
  maybeThrow()
  const items = readJson<Building[]>(STORAGE_KEYS.buildings, [])
  writeJson(
    STORAGE_KEYS.buildings,
    items.filter((b) => b.id !== id),
  )
}

export async function fetchRooms(): Promise<Room[]> {
  await ensureSeeded()
  await delay(500)
  maybeThrow()
  return readJson<Room[]>(STORAGE_KEYS.rooms, [])
}

export async function addRoom(data: Omit<Room, 'id'>): Promise<Room> {
  await ensureSeeded()
  await delay(500)
  maybeThrow()
  const items = readJson<Room[]>(STORAGE_KEYS.rooms, [])
  const id = `r${Math.random().toString(16).slice(2, 10)}`
  const next: Room = { ...data, id }
  writeJson(STORAGE_KEYS.rooms, [next, ...items])
  return next
}

export async function updateRoom(id: string, patch: Partial<Room>): Promise<Room> {
  await ensureSeeded()
  await delay(500)
  maybeThrow()
  const items = readJson<Room[]>(STORAGE_KEYS.rooms, [])
  const idx = items.findIndex((r) => r.id === id)
  if (idx < 0) throw new Error('Room not found')
  const updated = { ...items[idx], ...patch }
  const next = items.slice()
  next[idx] = updated
  writeJson(STORAGE_KEYS.rooms, next)
  return updated
}

export async function deleteRoom(id: string): Promise<void> {
  await ensureSeeded()
  await delay(500)
  maybeThrow()
  const items = readJson<Room[]>(STORAGE_KEYS.rooms, [])
  writeJson(
    STORAGE_KEYS.rooms,
    items.filter((r) => r.id !== id),
  )
}

export async function fetchUsers(): Promise<User[]> {
  await ensureSeeded()
  await delay(500)
  maybeThrow()
  return readJson<User[]>(STORAGE_KEYS.users, [])
}

export async function addUser(data: Omit<User, 'id' | 'createdAt'>): Promise<User> {
  await ensureSeeded()
  await delay(500)
  maybeThrow()
  const items = readJson<User[]>(STORAGE_KEYS.users, [])
  const id = `u${Math.random().toString(16).slice(2, 10)}`
  const next: User = { ...data, id, createdAt: new Date().toISOString() }
  writeJson(STORAGE_KEYS.users, [next, ...items])
  return next
}

export async function updateUser(id: string, patch: Partial<User>): Promise<User> {
  await ensureSeeded()
  await delay(500)
  maybeThrow()
  const items = readJson<User[]>(STORAGE_KEYS.users, [])
  const idx = items.findIndex((u) => u.id === id)
  if (idx < 0) throw new Error('User not found')
  const updated = { ...items[idx], ...patch }
  const next = items.slice()
  next[idx] = updated
  writeJson(STORAGE_KEYS.users, next)
  return updated
}

export async function deleteUser(id: string): Promise<void> {
  await ensureSeeded()
  await delay(500)
  maybeThrow()
  const items = readJson<User[]>(STORAGE_KEYS.users, [])
  writeJson(
    STORAGE_KEYS.users,
    items.filter((u) => u.id !== id),
  )
}

export async function fetchMaintenance(): Promise<MaintenanceRecord[]> {
  await ensureSeeded()
  await delay(500)
  maybeThrow()
  return readJson<MaintenanceRecord[]>(STORAGE_KEYS.maintenance, [])
}

export async function addMaintenance(data: Omit<MaintenanceRecord, 'id'>): Promise<MaintenanceRecord> {
  await ensureSeeded()
  await delay(500)
  maybeThrow()
  const items = readJson<MaintenanceRecord[]>(STORAGE_KEYS.maintenance, [])
  const id = `m${Math.random().toString(16).slice(2, 10)}`
  const next: MaintenanceRecord = { ...data, id }
  writeJson(STORAGE_KEYS.maintenance, [next, ...items])
  return next
}

export async function updateMaintenance(id: string, patch: Partial<MaintenanceRecord>): Promise<MaintenanceRecord> {
  await ensureSeeded()
  await delay(500)
  maybeThrow()
  const items = readJson<MaintenanceRecord[]>(STORAGE_KEYS.maintenance, [])
  const idx = items.findIndex((m) => m.id === id)
  if (idx < 0) throw new Error('Maintenance record not found')
  const updated = { ...items[idx], ...patch }
  const next = items.slice()
  next[idx] = updated
  writeJson(STORAGE_KEYS.maintenance, next)
  return updated
}

export async function deleteMaintenance(id: string): Promise<void> {
  await ensureSeeded()
  await delay(500)
  maybeThrow()
  const items = readJson<MaintenanceRecord[]>(STORAGE_KEYS.maintenance, [])
  writeJson(
    STORAGE_KEYS.maintenance,
    items.filter((m) => m.id !== id),
  )
}

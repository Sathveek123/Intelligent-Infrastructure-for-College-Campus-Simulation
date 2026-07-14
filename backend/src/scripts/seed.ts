import dotenv from 'dotenv'
import sequelize from '../config/database'
import '../models'
import Building from '../models/Building'
import MaintenanceRecord from '../models/MaintenanceRecord'
import OccupancyRecord from '../models/OccupancyRecord'
import Room from '../models/Room'
import SimulationRun from '../models/SimulationRun'
import User from '../models/User'
import { logger } from '../utils/logger'

dotenv.config()

const SEED_USERS = [
  {
    name: 'System Administrator',
    email: 'admin@college.edu',
    password: 'admin123',
    role: 'admin' as const,
    isActive: true,
  },
  {
    name: 'John Doe',
    email: 'john.doe@college.edu',
    password: 'staff123',
    role: 'staff' as const,
    isActive: true,
  },
  {
    name: 'Jane Smith',
    email: 'jane.smith@college.edu',
    password: 'staff123',
    role: 'staff' as const,
    isActive: true,
  },
]

const SEED_BUILDINGS = [
  {
    buildingName: 'Engineering Block A',
    buildingCode: 'ENG-A',
    totalFloors: 4,
    totalRooms: 24,
    constructionYear: 2015,
    buildingType: 'academic' as const,
    baseEnergyLoad: 500,
  },
  {
    buildingName: 'Science Complex',
    buildingCode: 'SCI-01',
    totalFloors: 5,
    totalRooms: 30,
    constructionYear: 2018,
    buildingType: 'laboratory' as const,
    baseEnergyLoad: 750,
  },
  {
    buildingName: 'Administrative Building',
    buildingCode: 'ADM-MAIN',
    totalFloors: 3,
    totalRooms: 18,
    constructionYear: 2010,
    buildingType: 'administrative' as const,
    baseEnergyLoad: 300,
  },
  {
    buildingName: 'Student Hostel Block 1',
    buildingCode: 'HOST-1',
    totalFloors: 6,
    totalRooms: 48,
    constructionYear: 2016,
    buildingType: 'hostel' as const,
    baseEnergyLoad: 600,
  },
  {
    buildingName: 'Central Library',
    buildingCode: 'LIB-CENT',
    totalFloors: 4,
    totalRooms: 20,
    constructionYear: 2012,
    buildingType: 'academic' as const,
    baseEnergyLoad: 400,
  },
]

const SEED_MAINTENANCE_TEMPLATES = [
  {
    type: 'room' as const,
    issueDescription: 'Air conditioning malfunction',
    priority: 'high' as const,
    status: 'completed' as const,
    cost: 1500,
    maintenanceDate: '2024-12-15',
    resolution: 'Replaced compressor unit',
  },
  {
    type: 'building' as const,
    issueDescription: 'Electrical panel upgrade',
    priority: 'medium' as const,
    status: 'in_progress' as const,
    cost: 5000,
    maintenanceDate: '2025-01-20',
    resolution: null as string | null,
  },
  {
    type: 'room' as const,
    issueDescription: 'Projector replacement needed',
    priority: 'low' as const,
    status: 'pending' as const,
    cost: 350,
    maintenanceDate: '2025-02-10',
    resolution: null as string | null,
  },
]

type PaginationEnv = {
  seedClear: boolean
  roomsPerBuildingMultiplier: number
  simulationRuns: number
  occupancyDays: number
}

function envNumber(name: string, fallback: number) {
  const raw = process.env[name]
  const v = raw ? Number(raw) : NaN
  return Number.isFinite(v) ? v : fallback
}

function getSeedEnv(): PaginationEnv {
  return {
    seedClear: process.env.SEED_CLEAR === 'true',
    roomsPerBuildingMultiplier: Math.max(1, envNumber('SEED_ROOMS_MULTIPLIER', 1)),
    simulationRuns: Math.min(200, Math.max(0, envNumber('SEED_SIM_RUNS', 25))),
    occupancyDays: Math.min(365, Math.max(0, envNumber('SEED_OCCUPANCY_DAYS', 90))),
  }
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function dateOnlyISO(d: Date) {
  return d.toISOString().slice(0, 10)
}

async function clearDatabase(transaction: any) {
  await OccupancyRecord.destroy({ where: {}, truncate: true, cascade: true, force: true, transaction })
  await SimulationRun.destroy({ where: {}, truncate: true, cascade: true, force: true, transaction })
  await MaintenanceRecord.destroy({ where: {}, truncate: true, cascade: true, force: true, transaction })
  await Room.destroy({ where: {}, truncate: true, cascade: true, force: true, transaction })
  await Building.destroy({ where: {}, truncate: true, cascade: true, force: true, transaction })
  await User.destroy({ where: {}, truncate: true, cascade: true, force: true, transaction })
}

async function seedUsers(transaction: any) {
  const users: User[] = []

  for (const u of SEED_USERS) {
    const passwordHash = await User.hashPassword(u.password)

    const [user] = await User.findOrCreate({
      where: { email: u.email },
      defaults: {
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
        isActive: u.isActive,
      },
      transaction,
    })

    // Keep idempotent: update name/role/active on subsequent runs.
    await user.update({ name: u.name, role: u.role, isActive: u.isActive }, { transaction })

    users.push(user)
  }

  return users
}

async function seedBuildings(transaction: any) {
  const maxBuildings = envNumber('SEED_BUILDINGS', SEED_BUILDINGS.length)
  const buildingsToCreate = SEED_BUILDINGS.slice(0, Math.max(0, Math.min(SEED_BUILDINGS.length, maxBuildings)))

  const buildings: Building[] = []

  for (const b of buildingsToCreate) {
    const [building] = await Building.findOrCreate({
      where: { buildingCode: b.buildingCode },
      defaults: b,
      transaction,
    })

    await building.update(
      {
        buildingName: b.buildingName,
        totalFloors: b.totalFloors,
        totalRooms: b.totalRooms,
        constructionYear: b.constructionYear,
        buildingType: b.buildingType,
        baseEnergyLoad: b.baseEnergyLoad,
      },
      { transaction },
    )

    buildings.push(building)
  }

  return buildings
}

function getRoomTemplatesForBuildingType(buildingType: string) {
  if (buildingType === 'laboratory') {
    return [
      { roomType: 'lab' as const, equipment: ['Fume hood', 'Microscope', 'Work benches'] },
      { roomType: 'classroom' as const, equipment: ['Projector', 'Whiteboard'] },
    ]
  }

  if (buildingType === 'administrative') {
    return [
      { roomType: 'office' as const, equipment: ['Desktop', 'Printer'] },
      { roomType: 'seminar_hall' as const, equipment: ['Projector', 'Conference table'] },
    ]
  }

  if (buildingType === 'hostel') {
    return [{ roomType: 'hostel_room' as const, equipment: ['Bed', 'Study desk', 'Fan'] }]
  }

  // academic
  return [
    { roomType: 'classroom' as const, equipment: ['Projector', 'Whiteboard'] },
    { roomType: 'lab' as const, equipment: ['Work benches', 'Tools'] },
    { roomType: 'seminar_hall' as const, equipment: ['Sound system', 'Projector'] },
  ]
}

function randomCapacity(roomType: string) {
  if (roomType === 'hostel_room') return randInt(2, 4)
  if (roomType === 'office') return randInt(4, 8)
  if (roomType === 'seminar_hall') return randInt(40, 120)
  if (roomType === 'lab') return randInt(20, 35)
  return randInt(30, 60)
}

function randomStatus(): 'available' | 'occupied' | 'maintenance' {
  const roll = Math.random()
  if (roll < 0.08) return 'maintenance'
  if (roll < 0.18) return 'occupied'
  return 'available'
}

function generateRoomsForBuilding(building: Building, multiplier: number) {
  const totalRooms = Math.max(1, Math.floor((building.totalRooms || 1) * multiplier))
  const templates = getRoomTemplatesForBuildingType(building.buildingType)

  const rooms: Array<{
    buildingId: string
    roomNumber: string
    floor: number
    capacity: number
    roomType: any
    equipmentList: string
    status: any
    currentOccupancy: number
  }> = []

  let roomCount = 0

  for (let floor = 1; floor <= building.totalFloors && roomCount < totalRooms; floor++) {
    for (let templateIndex = 0; templateIndex < templates.length; templateIndex++) {
      const t = templates[templateIndex]
      const roomsPerFloorPerType = Math.max(1, Math.ceil(totalRooms / (building.totalFloors * templates.length)))

      for (let i = 0; i < roomsPerFloorPerType && roomCount < totalRooms; i++) {
        const roomNumber = `${floor}${String(i + 1 + roomsPerFloorPerType * templateIndex).padStart(2, '0')}`
        const status = randomStatus()
        const capacity = randomCapacity(t.roomType)

        rooms.push({
          buildingId: building.id,
          roomNumber,
          floor,
          capacity,
          roomType: t.roomType,
          equipmentList: t.equipment.join(', '),
          status,
          currentOccupancy: status === 'occupied' ? randInt(1, Math.max(1, Math.floor(capacity * 0.9))) : 0,
        })

        roomCount++
      }
    }
  }

  return rooms
}

async function seedRooms(buildings: Building[], seedEnv: PaginationEnv, transaction: any) {
  const createdRooms: Room[] = []

  for (const b of buildings) {
    const roomsToCreate = generateRoomsForBuilding(b, seedEnv.roomsPerBuildingMultiplier)

    for (const r of roomsToCreate) {
      const [room] = await Room.findOrCreate({
        where: { buildingId: r.buildingId, roomNumber: r.roomNumber },
        defaults: r,
        transaction,
      })

      await room.update(
        {
          floor: r.floor,
          capacity: r.capacity,
          roomType: r.roomType,
          equipmentList: r.equipmentList,
          status: r.status,
          currentOccupancy: r.currentOccupancy,
        },
        { transaction },
      )

      createdRooms.push(room)
    }
  }

  return createdRooms
}

async function seedMaintenance(rooms: Room[], buildings: Building[], users: User[], transaction: any) {
  const createdBy = users.find((u) => u.role === 'admin')?.id ?? users[0].id

  const records: MaintenanceRecord[] = []

  for (const tpl of SEED_MAINTENANCE_TEMPLATES) {
    const isRoom = tpl.type === 'room'
    const room = isRoom ? choice(rooms) : null
    const building = !isRoom ? choice(buildings) : null

    const where = {
      maintenanceDate: tpl.maintenanceDate,
      issueDescription: tpl.issueDescription,
      roomId: room ? room.id : null,
      buildingId: building ? building.id : null,
    }

    const [rec] = await MaintenanceRecord.findOrCreate({
      where: where as any,
      defaults: {
        ...where,
        resolution: tpl.resolution,
        priority: tpl.priority,
        status: tpl.status,
        cost: tpl.cost,
        createdBy,
      } as any,
      transaction,
    })

    await rec.update(
      {
        resolution: tpl.resolution,
        priority: tpl.priority,
        status: tpl.status,
        cost: tpl.cost,
        createdBy,
      } as any,
      { transaction },
    )

    records.push(rec)
  }

  return records
}

async function seedSimulationHistory(buildings: Building[], users: User[], seedEnv: PaginationEnv, transaction: any) {
  const desired = seedEnv.simulationRuns
  const existing = await SimulationRun.count({ transaction })
  if (existing >= desired) return [] as SimulationRun[]

  const toCreate = desired - existing
  const runs: SimulationRun[] = []

  const creators = users.length ? users : ([] as User[])

  for (let i = 0; i < toCreate; i++) {
    const b = choice(buildings)
    const type = choice(['occupancy', 'energy', 'stress_test'] as const)
    const createdBy = creators.length ? choice(creators).id : users[0].id

    const daysAgo = randInt(0, 89)
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)

    let inputParameters: any = { buildingId: b.id }
    let outputResults: any = {}

    if (type === 'occupancy') {
      const totalStudents = randInt(50, 600)
      inputParameters = { buildingId: b.id, totalStudents }
      outputResults = { totalStudents, occupancyRate: randInt(30, 95), stressLevel: choice(['low', 'medium', 'high'] as const) }
    } else if (type === 'energy') {
      outputResults = { totalEnergyConsumption: randInt(300, 1800), exceedsThreshold: Math.random() < 0.2 }
    } else {
      outputResults = { infrastructureStressScore: randInt(20, 95) }
    }

    const run = await SimulationRun.create(
      {
        buildingId: b.id,
        simulationType: type,
        inputParameters,
        outputResults,
        totalStudents: type === 'occupancy' ? (inputParameters.totalStudents as number) : null,
        totalEnergyConsumption: type === 'energy' ? (outputResults.totalEnergyConsumption as number) : null,
        averageOccupancyRate: type === 'occupancy' ? (outputResults.occupancyRate as number) : null,
        stressLevel: type === 'occupancy' ? (outputResults.stressLevel as any) : null,
        createdBy,
        createdAt,
      } as any,
      { transaction },
    )

    runs.push(run)
  }

  return runs
}

async function seedOccupancyRecords(rooms: Room[], buildings: Building[], seedEnv: PaginationEnv, transaction: any) {
  const desiredDays = seedEnv.occupancyDays

  const existing = await OccupancyRecord.count({ transaction })
  if (existing > 0) return [] as OccupancyRecord[]

  const timeSlots = ['09:00-10:00', '10:00-11:00', '11:00-12:00', '14:00-15:00']

  const records: OccupancyRecord[] = []

  for (let d = desiredDays - 1; d >= 0; d--) {
    const recordDate = dateOnlyISO(new Date(Date.now() - d * 24 * 60 * 60 * 1000))

    for (const slot of timeSlots) {
      const sampleRooms = rooms.slice(0, Math.min(rooms.length, 50))
      for (const r of sampleRooms) {
        const capacity = r.capacity
        const studentCount = randInt(0, Math.max(0, Math.floor(capacity * 0.95)))
        const occupancyRate = capacity > 0 ? (studentCount / capacity) * 100 : 0

        const rec = await OccupancyRecord.create(
          {
            roomId: r.id,
            buildingId: r.buildingId,
            recordDate,
            timeSlot: slot,
            studentCount,
            occupancyRate: Number(occupancyRate.toFixed(2)),
          } as any,
          { transaction },
        )

        records.push(rec)
      }
    }
  }

  // Ensure every building has at least some data by adding one record if empty
  for (const b of buildings) {
    const count = await OccupancyRecord.count({ where: { buildingId: b.id }, transaction })
    if (count > 0) continue

    const room = rooms.find((r) => r.buildingId === b.id)
    if (!room) continue

    const rec = await OccupancyRecord.create(
      {
        roomId: room.id,
        buildingId: b.id,
        recordDate: dateOnlyISO(new Date()),
        timeSlot: '09:00-10:00',
        studentCount: 0,
        occupancyRate: 0,
      } as any,
      { transaction },
    )

    records.push(rec)
  }

  return records
}

async function seedDatabase() {
  const seedEnv = getSeedEnv()

  logger.info('Starting database seeding...')
  logger.info(`Dialect: ${process.env.DB_DIALECT || 'sqlite'}`)

  if (seedEnv.seedClear) {
    logger.warn('Recreating schema (force sync) because SEED_CLEAR=true...')
    await sequelize.sync({ force: true })
    logger.info('Schema recreated.')
  }

  const transaction = await sequelize.transaction()

  try {
    if (seedEnv.seedClear) {
      // Tables already dropped/recreated above; nothing to truncate.
    } else {
      // Optional: keep legacy truncate function available for non-force clears (not used by default).
      // No-op.
      void clearDatabase
    }

    logger.info('Seeding users...')
    const users = await seedUsers(transaction)
    logger.info(`Users: ${users.length}`)

    logger.info('Seeding buildings...')
    const buildings = await seedBuildings(transaction)
    logger.info(`Buildings: ${buildings.length}`)

    logger.info('Seeding rooms...')
    const rooms = await seedRooms(buildings, seedEnv, transaction)
    logger.info(`Rooms: ${rooms.length}`)

    logger.info('Seeding maintenance records...')
    const maintenance = await seedMaintenance(rooms, buildings, users, transaction)
    logger.info(`Maintenance: ${maintenance.length}`)

    logger.info('Seeding simulation runs (history)...')
    const runs = await seedSimulationHistory(buildings, users, seedEnv, transaction)
    logger.info(`Simulation runs created: ${runs.length}`)

    logger.info('Seeding occupancy records...')
    const occupancy = await seedOccupancyRecords(rooms, buildings, seedEnv, transaction)
    logger.info(`Occupancy records created: ${occupancy.length}`)

    await transaction.commit()

    logger.info('Database seeding completed successfully.')
    logger.info('Summary:')
    logger.info(`Users: ${users.length}`)
    logger.info(`Buildings: ${buildings.length}`)
    logger.info(`Rooms: ${rooms.length}`)
    logger.info(`Maintenance Records: ${maintenance.length}`)
    logger.info(`Simulation Runs (created): ${runs.length}`)
    logger.info(`Occupancy Records (created): ${occupancy.length}`)

    process.exit(0)
  } catch (error) {
    await transaction.rollback()
    logger.error('Seeding failed', { error })
    process.exit(1)
  }
}

sequelize
  .authenticate()
  .then(async () => {
    // Keep schema synced for local SQLite usage
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true })
    }

    await seedDatabase()
  })
  .catch((err) => {
    logger.error('Unable to connect to database', { err })
    process.exit(1)
  })

import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(50),
  role: z.enum(['admin', 'staff']).optional().default('staff'),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

export const createBuildingSchema = z.object({
  buildingName: z.string().min(2).max(100),
  buildingCode: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[A-Z0-9-]+$/),
  totalFloors: z.coerce.number().int().min(1).max(50),
  totalRooms: z.coerce.number().int().min(1).max(500),
  constructionYear: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 5),
  buildingType: z.enum(['academic', 'administrative', 'hostel', 'laboratory']),
  baseEnergyLoad: z.coerce.number().min(0).max(10000).optional().default(0),
})

export const updateBuildingSchema = createBuildingSchema.partial()

export const createRoomSchema = z.object({
  buildingId: z.string().uuid(),
  roomNumber: z.string().min(1).max(20),
  floor: z.coerce.number().int().min(1),
  capacity: z.coerce.number().int().min(1).max(500),
  roomType: z.enum(['classroom', 'lab', 'seminar_hall', 'hostel_room', 'office']),
  equipmentList: z.string().optional(),
  status: z.enum(['available', 'occupied', 'maintenance']).optional().default('available'),
  currentOccupancy: z.coerce.number().int().min(0).optional().default(0),
})

export const updateRoomSchema = createRoomSchema.partial()

const maintenanceBaseSchema = z.object({
  roomId: z.string().uuid().optional().nullable(),
  buildingId: z.string().uuid().optional().nullable(),
  maintenanceDate: z.string().min(1),
  issueDescription: z.string().min(10).max(1000),
  resolution: z.string().max(1000).optional().nullable(),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  status: z.enum(['pending', 'in_progress', 'completed']).optional().default('pending'),
  cost: z.coerce.number().min(0).optional().nullable(),
})

export const createMaintenanceSchema = maintenanceBaseSchema.refine((data) => data.roomId || data.buildingId, {
  message: 'Either roomId or buildingId must be provided',
})

export const updateMaintenanceSchema = maintenanceBaseSchema.partial()

export const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(50),
  role: z.enum(['admin', 'staff']).optional().default('staff'),
  isActive: z.boolean().optional().default(true),
})

export const updateUserSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).max(50).optional(),
    role: z.enum(['admin', 'staff']).optional(),
    isActive: z.boolean().optional(),
  })
  .partial()

export const occupancySimulationSchema = z.object({
  buildingId: z.string().uuid(),
  totalStudents: z.coerce.number().int().min(1).max(10000),
})

export const energySimulationSchema = z.object({
  buildingId: z.string().uuid(),
  roomOccupancyData: z.array(
    z.object({
      roomId: z.string().uuid(),
      studentCount: z.coerce.number().int().min(0),
      equipmentLoad: z.coerce.number().min(0).optional().default(0),
    }),
  ),
})

export const stressTestSchema = z.object({
  buildingId: z.string().uuid(),
  maxCapacityScenario: z.coerce.number().int().min(0).optional(),
})

export const analyticsQuerySchema = z.object({
  buildingId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

/// <reference path="./types/express.d.ts" />
import cors from 'cors'
import dotenv from 'dotenv'
import express, { type Request, type Response } from 'express'
import sequelize from './config/database'
import './models'
import User from './models/User'
import { errorHandler } from './middleware/errorHandler'
import { authLimiter, generalLimiter, simulationLimiter } from './middleware/rateLimiter'
import authRoutes from './routes/authRoutes'
import analyticsRoutes from './routes/analyticsRoutes'
import auditRoutes from './routes/auditRoutes'
import buildingRoutes from './routes/buildingRoutes'
import maintenanceRoutes from './routes/maintenanceRoutes'
import metricsRoutes from './routes/metricsRoutes'
import predictiveMaintenanceRoutes from './routes/predictiveMaintenanceRoutes'
import roomRoutes from './routes/roomRoutes'
import simulationRoutes from './routes/simulationRoutes'
import userRoutes from './routes/userRoutes'
import { startMetricsJob } from './jobs/metricsJob'
import { startPredictiveMaintenanceJob } from './jobs/predictiveMaintenanceJob'
import { startHealthSnapshotJob } from './jobs/healthSnapshotJob'
import { logger } from './utils/logger'

dotenv.config()

const app = express()
const PORT = process.env.PORT ? Number(process.env.PORT) : 5000

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
)
app.use(express.json())

app.use('/api', generalLimiter)
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)
app.use('/api/auth/refresh', authLimiter)
app.use('/api/simulation', simulationLimiter)

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

app.get('/status', async (_req: Request, res: Response) => {
  try {
    await sequelize.query('SELECT 1')
    const uptimeSeconds = Math.floor(process.uptime())
    return res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptimeSeconds,
      nodeEnv: process.env.NODE_ENV ?? 'development',
      version: process.env.npm_package_version ?? 'unknown',
      db: { ok: true },
    })
  } catch (error) {
    logger.error('Status check failed', { error })
    return res.status(503).json({
      status: 'DEGRADED',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? 'unknown',
      db: { ok: false },
    })
  }
})

app.use('/api/auth', authRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/audit', auditRoutes)
app.use('/api/buildings', buildingRoutes)
app.use('/api/rooms', roomRoutes)
app.use('/api/maintenance', maintenanceRoutes)
app.use('/api/metrics', metricsRoutes)
app.use('/api/predictive-maintenance', predictiveMaintenanceRoutes)
app.use('/api/users', userRoutes)
app.use('/api/simulation', simulationRoutes)

app.use(errorHandler)

async function startServer() {
  await sequelize.authenticate()

  if (process.env.NODE_ENV !== 'production') {
    await sequelize.sync({ alter: true })

    const adminEmail = 'admin@college.edu'
    const staffEmail = 'staff@college.edu'

    const existingAdmin = await User.findOne({ where: { email: adminEmail } })
    if (!existingAdmin) {
      const passwordHash = await User.hashPassword('admin123')
      await User.create({ name: 'Campus Admin', email: adminEmail, passwordHash, role: 'admin', isActive: true })
    }

    const existingStaff = await User.findOne({ where: { email: staffEmail } })
    if (!existingStaff) {
      const passwordHash = await User.hashPassword('admin123')
      await User.create({ name: 'Staff Member', email: staffEmail, passwordHash, role: 'staff', isActive: true })
    }
  }

  const server = app.listen(PORT, () => {
    const dialect = process.env.DB_DIALECT || 'sqlite'
    const storage = process.env.DB_STORAGE || './dev.sqlite'
    logger.info(`DB dialect: ${dialect}${dialect === 'sqlite' ? ` (storage: ${storage})` : ''}`)
    logger.info(`Server running on port ${PORT}`)

    if (process.env.NODE_ENV === 'production') {
      startMetricsJob()
      startPredictiveMaintenanceJob()
      startHealthSnapshotJob()
    }
  })

  const shutdown = async (signal: string) => {
    logger.warn(`Received ${signal}. Shutting down...`)
    server.close(async () => {
      try {
        await sequelize.close()
        logger.info('Shutdown complete')
        process.exit(0)
      } catch (error) {
        logger.error('Shutdown error', { error })
        process.exit(1)
      }
    })
  }

  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
}

startServer().catch((err) => {
  logger.error('Unable to start server', { err })
  process.exit(1)
})

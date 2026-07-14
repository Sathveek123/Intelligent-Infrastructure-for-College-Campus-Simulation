import cron from 'node-cron'
import Building from '../models/Building'
import { healthSnapshotService } from '../services/healthSnapshotService'
import { logger } from '../utils/logger'

export function startHealthSnapshotJob() {
  cron.schedule('0 4 * * *', async () => {
    logger.info('Creating daily health snapshots...')

    try {
      const buildings = await Building.findAll({ attributes: ['id'] })

      for (const b of buildings) {
        await healthSnapshotService.createSnapshot(b.id, 'daily')
      }

      logger.info(`Created ${buildings.length} health snapshots`)
    } catch (error) {
      logger.error('Daily snapshot job failed', { error })
    }
  })

  logger.info('Health snapshot job scheduled (daily at 4:00 AM)')
}

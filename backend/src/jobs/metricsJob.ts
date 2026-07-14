import cron from 'node-cron'
import { metricsService } from '../services/metricsService'
import { logger } from '../utils/logger'

export function startMetricsJob() {
  cron.schedule('0 2 * * *', async () => {
    logger.info('Running scheduled building metrics calculation...')

    try {
      await metricsService.calculateAllBuildingsMetrics()
      logger.info('Scheduled metrics calculation completed')
    } catch (error) {
      logger.error('Scheduled metrics calculation failed', { error })
    }
  })

  logger.info('Metrics job scheduled (daily at 2:00 AM)')
}

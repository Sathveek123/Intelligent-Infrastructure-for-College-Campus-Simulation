import cron from 'node-cron'
import { predictiveMaintenanceService } from '../services/predictiveMaintenanceService'
import { logger } from '../utils/logger'

export function startPredictiveMaintenanceJob() {
  cron.schedule('0 3 * * *', async () => {
    logger.info('Running scheduled predictive maintenance analysis...')

    try {
      await predictiveMaintenanceService.runPredictiveAnalysis()
      logger.info('Scheduled predictive analysis completed')
    } catch (error) {
      logger.error('Scheduled predictive analysis failed', { error })
    }
  })

  logger.info('Predictive maintenance job scheduled (daily at 3:00 AM)')
}

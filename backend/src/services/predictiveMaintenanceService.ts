import { Op } from 'sequelize'
import Building from '../models/Building'
import BuildingMetrics from '../models/BuildingMetrics'
import MaintenanceRecord, { type MaintenancePriority, type PredictionSource } from '../models/MaintenanceRecord'
import OccupancyRecord from '../models/OccupancyRecord'
import Room from '../models/Room'
import SimulationRun from '../models/SimulationRun'
import { metricsService } from './metricsService'
import { auditService } from './auditService'
import { logger } from '../utils/logger'

export type PredictionTriggerType = PredictionSource

export interface PredictionTrigger {
  type: PredictionTriggerType
  triggered: boolean
  reason: string
  confidence: number
  severity: MaintenancePriority
}

export interface PredictionResult {
  buildingId: string
  buildingName: string
  shouldPredict: boolean
  triggers: PredictionTrigger[]
  overallConfidence: number
  recommendedPriority: MaintenancePriority
  predictedMaintenanceDate: Date
}

function toNumber(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    if (!Number.isNaN(n)) return n
  }
  return 0
}

export class PredictiveMaintenanceService {
  private readonly HEALTH_SCORE_CRITICAL_THRESHOLD = 60
  private readonly STRESS_COUNT_THRESHOLD = 3
  private readonly STRESS_DAYS_WINDOW = 7
  private readonly OCCUPANCY_HIGH_THRESHOLD = 90
  private readonly OCCUPANCY_COUNT_THRESHOLD = 5
  private readonly ENERGY_EFFICIENCY_LOW_THRESHOLD = 50

  async runPredictiveAnalysis(): Promise<PredictionResult[]> {
    const buildings = await Building.findAll({
      attributes: ['id', 'buildingName'],
      include: [
        { model: BuildingMetrics, as: 'metrics' },
        { model: Room, as: 'rooms' },
      ],
    })

    const predictions: PredictionResult[] = []

    for (const b of buildings) {
      try {
        const prediction = await this.analyzeBuildingForPrediction(b.id)
        if (prediction.shouldPredict) {
          predictions.push(prediction)
          await this.createPredictedMaintenance(prediction)
        }
      } catch (error) {
        logger.error(`Failed to analyze building ${b.id}`, { error })
      }
    }

    return predictions
  }

  async analyzeBuildingForPrediction(buildingId: string): Promise<PredictionResult> {
    const building = await Building.findByPk(buildingId, {
      attributes: ['id', 'buildingName'],
      include: [{ model: BuildingMetrics, as: 'metrics' }],
    })

    if (!building) throw new Error('Building not found')

    const triggers: PredictionTrigger[] = [
      await this.checkHealthScore(buildingId),
      await this.checkStressAnalysis(buildingId),
      await this.checkOccupancyThreshold(buildingId),
      await this.checkEnergyEfficiency(buildingId),
    ]

    const activeTriggers = triggers.filter((t) => t.triggered)

    const overallConfidence =
      activeTriggers.length > 0
        ? activeTriggers.reduce((sum, t) => sum + t.confidence, 0) / activeTriggers.length
        : 0

    const shouldPredict = activeTriggers.length > 0
    const recommendedPriority = this.determinePriority(activeTriggers)
    const predictedMaintenanceDate = this.estimateMaintenanceDate(recommendedPriority)

    return {
      buildingId,
      buildingName: building.buildingName,
      shouldPredict,
      triggers: activeTriggers,
      overallConfidence: Number(overallConfidence.toFixed(2)),
      recommendedPriority,
      predictedMaintenanceDate,
    }
  }

  private async checkHealthScore(buildingId: string): Promise<PredictionTrigger> {
    const metrics = await BuildingMetrics.findOne({ where: { buildingId } })

    if (!metrics) {
      return { type: 'health_score', triggered: false, reason: '', confidence: 0, severity: 'low' }
    }

    const score = toNumber(metrics.overallHealthScore)

    if (metrics.healthStatus === 'critical' || score < this.HEALTH_SCORE_CRITICAL_THRESHOLD) {
      return {
        type: 'health_score',
        triggered: true,
        reason: `Building health score is critical (${score}%). Immediate attention required to prevent infrastructure degradation.`,
        confidence: Math.max(0, Math.min(100, 100 - score)),
        severity: 'critical',
      }
    }

    if (metrics.healthStatus === 'moderate' && score < 70) {
      return {
        type: 'health_score',
        triggered: true,
        reason: `Building health score is moderate (${score}%) and approaching critical threshold. Preventive maintenance recommended.`,
        confidence: Math.max(0, Math.min(100, 70 - score)),
        severity: 'high',
      }
    }

    return { type: 'health_score', triggered: false, reason: '', confidence: 0, severity: 'low' }
  }

  private async checkStressAnalysis(buildingId: string): Promise<PredictionTrigger> {
    const windowStart = new Date()
    windowStart.setDate(windowStart.getDate() - this.STRESS_DAYS_WINDOW)

    const recentSimulations = await SimulationRun.findAll({
      where: {
        buildingId,
        createdAt: { [Op.gte]: windowStart },
      },
      order: [['createdAt', 'DESC']],
      limit: 10,
    })

    if (recentSimulations.length === 0) {
      return { type: 'stress_analysis', triggered: false, reason: '', confidence: 0, severity: 'low' }
    }

    const highStressCount = recentSimulations.filter((sim) => sim.stressLevel === 'high').length

    if (highStressCount >= this.STRESS_COUNT_THRESHOLD) {
      const percentage = (highStressCount / recentSimulations.length) * 100

      return {
        type: 'stress_analysis',
        triggered: true,
        reason: `Building experienced high stress in ${highStressCount} out of ${recentSimulations.length} recent simulations (${percentage.toFixed(0)}%). Infrastructure is consistently over-utilized.`,
        confidence: Math.min(95, 60 + highStressCount * 10),
        severity: highStressCount >= 5 ? 'critical' : 'high',
      }
    }

    return { type: 'stress_analysis', triggered: false, reason: '', confidence: 0, severity: 'low' }
  }

  private async checkOccupancyThreshold(buildingId: string): Promise<PredictionTrigger> {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const occupancyRecords = await OccupancyRecord.findAll({
      where: {
        buildingId,
        recordDate: { [Op.gte]: thirtyDaysAgo },
      },
      attributes: ['occupancyRate'],
      limit: 50,
    })

    if (occupancyRecords.length < this.OCCUPANCY_COUNT_THRESHOLD) {
      return { type: 'occupancy_threshold', triggered: false, reason: '', confidence: 0, severity: 'low' }
    }

    const highOccupancyCount = occupancyRecords.filter((r) => toNumber(r.occupancyRate) > this.OCCUPANCY_HIGH_THRESHOLD).length
    const percentage = (highOccupancyCount / occupancyRecords.length) * 100

    if (percentage > 40) {
      return {
        type: 'occupancy_threshold',
        triggered: true,
        reason: `Building frequently operates above ${this.OCCUPANCY_HIGH_THRESHOLD}% occupancy (${percentage.toFixed(0)}% of recent records). Sustained high utilization increases wear and tear.`,
        confidence: Math.min(90, 50 + percentage / 2),
        severity: percentage > 60 ? 'high' : 'medium',
      }
    }

    return { type: 'occupancy_threshold', triggered: false, reason: '', confidence: 0, severity: 'low' }
  }

  private async checkEnergyEfficiency(buildingId: string): Promise<PredictionTrigger> {
    const metrics = await BuildingMetrics.findOne({ where: { buildingId } })

    if (!metrics) {
      return { type: 'energy_threshold', triggered: false, reason: '', confidence: 0, severity: 'low' }
    }

    const energyEfficiency = toNumber(metrics.averageEnergyEfficiency)

    if (energyEfficiency < this.ENERGY_EFFICIENCY_LOW_THRESHOLD) {
      const confidence = Math.min(100, this.ENERGY_EFFICIENCY_LOW_THRESHOLD - energyEfficiency + 40)

      return {
        type: 'energy_threshold',
        triggered: true,
        reason: `Energy efficiency is critically low (${energyEfficiency.toFixed(1)}%). This indicates potential HVAC, lighting, or equipment issues requiring maintenance.`,
        confidence,
        severity: energyEfficiency < 40 ? 'critical' : 'high',
      }
    }

    return { type: 'energy_threshold', triggered: false, reason: '', confidence: 0, severity: 'low' }
  }

  private determinePriority(triggers: PredictionTrigger[]): MaintenancePriority {
    if (triggers.some((t) => t.severity === 'critical')) return 'critical'
    if (triggers.some((t) => t.severity === 'high')) return 'high'
    if (triggers.some((t) => t.severity === 'medium')) return 'medium'
    return 'low'
  }

  private estimateMaintenanceDate(priority: MaintenancePriority): Date {
    const date = new Date()

    switch (priority) {
      case 'critical':
        date.setDate(date.getDate() + 3)
        break
      case 'high':
        date.setDate(date.getDate() + 7)
        break
      case 'medium':
        date.setDate(date.getDate() + 14)
        break
      default:
        date.setDate(date.getDate() + 30)
    }

    return date
  }

  async createPredictedMaintenance(prediction: PredictionResult): Promise<void> {
    const existing = await MaintenanceRecord.findOne({
      where: {
        buildingId: prediction.buildingId,
        isPredicted: true,
        isDismissed: false,
        status: { [Op.in]: ['pending', 'in_progress'] },
      },
    })

    if (existing) return

    const combinedReason = prediction.triggers.map((t, i) => `${i + 1}. ${t.reason}`).join('\n\n')

    const primarySource = prediction.triggers.reduce((max, t) => (t.confidence > max.confidence ? t : max), prediction.triggers[0])

    await MaintenanceRecord.create({
      buildingId: prediction.buildingId,
      roomId: null,
      maintenanceDate: prediction.predictedMaintenanceDate.toISOString().slice(0, 10),
      issueDescription: `[PREDICTED] Preventive maintenance recommended based on automated analysis.`,
      resolution: null,
      priority: prediction.recommendedPriority,
      status: 'pending',
      cost: null,
      isPredicted: true,
      predictedReason: combinedReason,
      predictedAt: new Date(),
      predictionConfidence: prediction.overallConfidence,
      predictionSource: primarySource.type,
      isDismissed: false,
      dismissedBy: null,
      dismissedAt: null,
      dismissalReason: null,
      createdBy: null,
    })

    const building = await Building.findByPk(prediction.buildingId)
    await auditService.logPrediction(prediction.buildingId, building?.buildingName ?? 'unknown', prediction.overallConfidence)
  }

  async convertToScheduled(maintenanceId: string, userId: string, actualDate: Date, actualCost?: number): Promise<void> {
    const record = await MaintenanceRecord.findByPk(maintenanceId)
    if (!record || !record.isPredicted) throw new Error('Invalid predicted maintenance record')

    await record.update({
      maintenanceDate: actualDate.toISOString().slice(0, 10),
      cost: actualCost ?? null,
      status: 'in_progress',
      createdBy: userId,
    })

    auditService
      .log({
        actorId: userId,
        actorRole: 'staff',
        action: 'prediction_converted',
        entity: 'prediction',
        entityId: maintenanceId,
        metadata: { actualDate: actualDate.toISOString().slice(0, 10), actualCost: actualCost ?? null },
        result: 'success',
      })
      .catch((error) => logger.error('Audit log failed', { error }))
  }

  async dismissPrediction(maintenanceId: string, userId: string, reason: string): Promise<void> {
    const record = await MaintenanceRecord.findByPk(maintenanceId)
    if (!record || !record.isPredicted) throw new Error('Invalid predicted maintenance record')

    await record.update({
      isDismissed: true,
      dismissedBy: userId,
      dismissedAt: new Date(),
      dismissalReason: reason,
      status: 'completed',
    })

    auditService
      .log({
        actorId: userId,
        actorRole: 'staff',
        action: 'prediction_dismissed',
        entity: 'prediction',
        entityId: maintenanceId,
        metadata: { reason },
        result: 'success',
      })
      .catch((error) => logger.error('Audit log failed', { error }))
  }

  async getActivePredictions() {
    const predictions = await MaintenanceRecord.findAll({
      where: {
        isPredicted: true,
        isDismissed: false,
        status: { [Op.in]: ['pending', 'in_progress'] },
      },
      include: [{ model: Building, as: 'building', attributes: ['id', 'buildingName', 'buildingCode'] }],
      order: [
        ['priority', 'ASC'],
        ['predictedAt', 'DESC'],
      ],
    })

    return predictions.map((p) => {
      const building = (p as unknown as MaintenanceRecord & { building?: Building }).building
      return {
        id: p.id,
        buildingId: p.buildingId,
        buildingName: building?.buildingName,
        buildingCode: building?.buildingCode,
        predictedAt: p.predictedAt,
        predictedReason: p.predictedReason,
        confidence: p.predictionConfidence,
        source: p.predictionSource,
        priority: p.priority,
        estimatedDate: p.maintenanceDate,
        status: p.status,
      }
    })
  }
}

export const predictiveMaintenanceService = new PredictiveMaintenanceService()

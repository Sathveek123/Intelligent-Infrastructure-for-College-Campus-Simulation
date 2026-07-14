import { Op } from 'sequelize'
import Building from '../models/Building'
import BuildingMetrics, { type HealthStatus } from '../models/BuildingMetrics'
import MaintenanceRecord from '../models/MaintenanceRecord'
import SimulationRun from '../models/SimulationRun'
import { predictiveMaintenanceService } from './predictiveMaintenanceService'
import { healthSnapshotService } from './healthSnapshotService'
import { logger } from '../utils/logger'

export type HealthScoreComponents = {
  occupancyEfficiency: number
  energyEfficiency: number
  maintenanceHealth: number
  overallScore: number
  status: HealthStatus
}

type MetricsWithBuilding = BuildingMetrics & {
  building?: Building
}

function toNumber(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    if (!Number.isNaN(n)) return n
  }
  return 0
}

export class MetricsService {
  async calculateBuildingMetrics(buildingId: string): Promise<HealthScoreComponents> {
    const building = await Building.findByPk(buildingId)
    if (!building) throw new Error('Building not found')

    const occupancyEfficiency = await this.calculateOccupancyEfficiency(buildingId)
    const energyEfficiency = await this.calculateEnergyEfficiency(buildingId)
    const maintenanceHealth = await this.calculateMaintenanceHealth(buildingId)

    const overallScore = this.calculateOverallScore(occupancyEfficiency, energyEfficiency, maintenanceHealth)
    const status = this.classifyHealthStatus(overallScore)

    await this.saveMetrics(buildingId, { occupancyEfficiency, energyEfficiency, maintenanceHealth, overallScore, status })

    healthSnapshotService.createSnapshot(buildingId, 'post_simulation').catch((error) => {
      logger.error('Failed to create health snapshot', { error })
    })

    predictiveMaintenanceService
      .analyzeBuildingForPrediction(buildingId)
      .then(async (prediction) => {
        if (prediction.shouldPredict) {
          await predictiveMaintenanceService.createPredictedMaintenance(prediction)
        }
      })
      .catch((error) => {
        logger.error('Predictive analysis failed', { error })
      })

    return { occupancyEfficiency, energyEfficiency, maintenanceHealth, overallScore, status }
  }

  private async calculateOccupancyEfficiency(buildingId: string): Promise<number> {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const simulations = await SimulationRun.findAll({
      where: {
        buildingId,
        simulationType: 'occupancy',
        createdAt: { [Op.gte]: thirtyDaysAgo },
      },
      attributes: ['averageOccupancyRate'],
      limit: 20,
      order: [['createdAt', 'DESC']],
    })

    if (simulations.length === 0) return 50

    const avgOccupancy =
      simulations.reduce((sum, sim) => sum + toNumber(sim.averageOccupancyRate), 0) /
      Math.max(1, simulations.length)

    let score = 0

    if (avgOccupancy >= 60 && avgOccupancy <= 85) {
      score = 100
    } else if (avgOccupancy >= 50 && avgOccupancy < 60) {
      score = 80 + ((avgOccupancy - 50) / 10) * 20
    } else if (avgOccupancy > 85 && avgOccupancy <= 90) {
      score = 100 - ((avgOccupancy - 85) / 5) * 20
    } else if (avgOccupancy < 50) {
      score = (avgOccupancy / 50) * 80
    } else if (avgOccupancy > 90) {
      score = Math.max(0, 80 - ((avgOccupancy - 90) / 10) * 80)
    }

    return Number(score.toFixed(2))
  }

  private async calculateEnergyEfficiency(buildingId: string): Promise<number> {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const simulations = await SimulationRun.findAll({
      where: {
        buildingId,
        simulationType: 'energy',
        createdAt: { [Op.gte]: thirtyDaysAgo },
      },
      attributes: ['outputResults'],
      limit: 20,
      order: [['createdAt', 'DESC']],
    })

    if (simulations.length === 0) return 50

    const scores = simulations
      .map((sim) => {
        const results = sim.outputResults as Record<string, unknown>
        return toNumber(results?.efficiencyScore)
      })
      .filter((n) => n > 0)

    if (scores.length === 0) return 50

    const avg = scores.reduce((sum, n) => sum + n, 0) / scores.length
    return Number(avg.toFixed(2))
  }

  private async calculateMaintenanceHealth(buildingId: string): Promise<number> {
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const maintenanceRecords = await MaintenanceRecord.findAll({
      where: {
        buildingId,
        createdAt: { [Op.gte]: ninetyDaysAgo },
      },
    })

    if (maintenanceRecords.length === 0) return 100

    let score = 100

    const pending = maintenanceRecords.filter((r) => r.status === 'pending').length
    const inProgress = maintenanceRecords.filter((r) => r.status === 'in_progress').length
    const critical = maintenanceRecords.filter((r) => r.priority === 'critical').length
    const high = maintenanceRecords.filter((r) => r.priority === 'high').length

    score -= pending * 5
    score -= inProgress * 3
    score -= critical * 15
    score -= high * 10

    const monthlyFrequency = maintenanceRecords.length / 3
    if (monthlyFrequency > 5) score -= (monthlyFrequency - 5) * 5

    score = Math.max(0, Math.min(100, score))
    return Number(score.toFixed(2))
  }

  private calculateOverallScore(occupancyEfficiency: number, energyEfficiency: number, maintenanceHealth: number): number {
    const score = occupancyEfficiency * 0.4 + energyEfficiency * 0.3 + maintenanceHealth * 0.3
    return Number(score.toFixed(2))
  }

  private classifyHealthStatus(score: number): HealthStatus {
    if (score >= 80) return 'healthy'
    if (score >= 60) return 'moderate'
    return 'critical'
  }

  private async saveMetrics(buildingId: string, components: HealthScoreComponents): Promise<void> {
    await BuildingMetrics.upsert({
      buildingId,
      averageOccupancyEfficiency: components.occupancyEfficiency,
      averageEnergyEfficiency: components.energyEfficiency,
      maintenanceHealthScore: components.maintenanceHealth,
      overallHealthScore: components.overallScore,
      healthStatus: components.status,
      calculatedAt: new Date(),
    })
  }

  async calculateAllBuildingsMetrics(): Promise<void> {
    const buildings = await Building.findAll({ attributes: ['id'] })
    for (const b of buildings) {
      await this.calculateBuildingMetrics(b.id)
    }
  }

  async getAllBuildingMetrics() {
    const metrics = await BuildingMetrics.findAll({
      include: [{ model: Building, as: 'building', attributes: ['id', 'buildingName', 'buildingCode', 'buildingType'] }],
      order: [['overallHealthScore', 'DESC']],
    })

    return metrics.map((m) => {
      const withBuilding = m as unknown as MetricsWithBuilding
      return {
        buildingId: m.buildingId,
        buildingName: withBuilding.building?.buildingName,
        buildingCode: withBuilding.building?.buildingCode,
        buildingType: withBuilding.building?.buildingType,
        healthScore: toNumber(m.overallHealthScore),
        healthStatus: m.healthStatus,
        components: {
          occupancyEfficiency: toNumber(m.averageOccupancyEfficiency),
          energyEfficiency: toNumber(m.averageEnergyEfficiency),
          maintenanceHealth: toNumber(m.maintenanceHealthScore),
        },
        lastCalculated: m.calculatedAt,
      }
    })
  }

  async getBuildingMetrics(buildingId: string) {
    const m = await BuildingMetrics.findOne({
      where: { buildingId },
      include: [{ model: Building, as: 'building', attributes: ['id', 'buildingName', 'buildingCode', 'buildingType'] }],
    })

    if (!m) return null

    const withBuilding = m as unknown as MetricsWithBuilding

    return {
      buildingId: m.buildingId,
      buildingName: withBuilding.building?.buildingName,
      buildingCode: withBuilding.building?.buildingCode,
      buildingType: withBuilding.building?.buildingType,
      healthScore: toNumber(m.overallHealthScore),
      healthStatus: m.healthStatus,
      components: {
        occupancyEfficiency: toNumber(m.averageOccupancyEfficiency),
        energyEfficiency: toNumber(m.averageEnergyEfficiency),
        maintenanceHealth: toNumber(m.maintenanceHealthScore),
      },
      lastCalculated: m.calculatedAt,
    }
  }
}

export const metricsService = new MetricsService()

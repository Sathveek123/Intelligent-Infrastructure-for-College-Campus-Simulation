import { Op } from 'sequelize'
import Building from '../models/Building'
import BuildingMetrics from '../models/BuildingMetrics'
import BuildingMetricsHistory, { type SnapshotType } from '../models/BuildingMetricsHistory'

export type HealthSnapshot = {
  date: string
  healthScore: number
  healthStatus: 'healthy' | 'moderate' | 'critical'
  components: {
    occupancyEfficiency: number
    energyEfficiency: number
    maintenanceHealth: number
  }
}

export type TrendDirection = 'improving' | 'declining' | 'stable'

export type TrendAnalysis = {
  direction: TrendDirection
  averageChange: number
  movingAverage7Day: number
  movingAverage30Day: number
}

export type HealthAnomaly = {
  date: string
  type: 'sudden_drop' | 'sustained_decline' | 'status_downgrade'
  description: string
  severity: 'high' | 'medium' | 'low'
}

function toNumber(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    if (!Number.isNaN(n)) return n
  }
  return 0
}

function formatDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function movingAverage(values: number[], window: number): number {
  if (values.length === 0) return 0
  const slice = values.slice(Math.max(0, values.length - window))
  const avg = slice.reduce((sum, v) => sum + v, 0) / slice.length
  return Number(avg.toFixed(2))
}

export class HealthSnapshotService {
  async createSnapshot(buildingId: string, type: SnapshotType): Promise<void> {
    const metrics = await BuildingMetrics.findOne({ where: { buildingId } })
    if (!metrics) return

    const now = new Date()

    await BuildingMetricsHistory.create({
      buildingId,
      healthScore: toNumber(metrics.overallHealthScore),
      healthStatus: metrics.healthStatus,
      occupancyEfficiency: toNumber(metrics.averageOccupancyEfficiency),
      energyEfficiency: toNumber(metrics.averageEnergyEfficiency),
      maintenanceHealth: toNumber(metrics.maintenanceHealthScore),
      recordedAt: formatDateOnly(now),
      snapshotType: type,
    })
  }

  async getSnapshots(buildingId: string, days: number): Promise<HealthSnapshot[]> {
    const start = new Date()
    start.setDate(start.getDate() - Math.max(1, days))

    const rows = await BuildingMetricsHistory.findAll({
      where: {
        buildingId,
        recordedAt: { [Op.gte]: formatDateOnly(start) },
      },
      order: [['recordedAt', 'ASC']],
    })

    return rows.map((r) => ({
      date: r.recordedAt,
      healthScore: toNumber(r.healthScore),
      healthStatus: r.healthStatus,
      components: {
        occupancyEfficiency: toNumber(r.occupancyEfficiency),
        energyEfficiency: toNumber(r.energyEfficiency),
        maintenanceHealth: toNumber(r.maintenanceHealth),
      },
    }))
  }

  async analyzeTrend(buildingId: string, days: number): Promise<TrendAnalysis> {
    const snapshots = await this.getSnapshots(buildingId, days)
    const scores = snapshots.map((s) => s.healthScore)

    if (scores.length < 2) {
      return {
        direction: 'stable',
        averageChange: 0,
        movingAverage7Day: movingAverage(scores, 7),
        movingAverage30Day: movingAverage(scores, 30),
      }
    }

    const deltas = scores.slice(1).map((v, i) => v - scores[i])
    const avgDelta = deltas.reduce((sum, v) => sum + v, 0) / deltas.length

    const direction: TrendDirection = avgDelta > 0.75 ? 'improving' : avgDelta < -0.75 ? 'declining' : 'stable'

    return {
      direction,
      averageChange: Number(avgDelta.toFixed(2)),
      movingAverage7Day: movingAverage(scores, 7),
      movingAverage30Day: movingAverage(scores, 30),
    }
  }

  async detectAnomalies(buildingId: string, days: number): Promise<HealthAnomaly[]> {
    const snapshots = await this.getSnapshots(buildingId, days)
    const anomalies: HealthAnomaly[] = []

    for (let i = 1; i < snapshots.length; i++) {
      const prev = snapshots[i - 1]
      const cur = snapshots[i]
      const delta = cur.healthScore - prev.healthScore

      if (delta <= -15) {
        anomalies.push({
          date: cur.date,
          type: 'sudden_drop',
          description: `Sudden health score drop of ${Math.abs(Math.round(delta))} points in 24 hours.`,
          severity: 'high',
        })
      }

      const downgrade = this.statusRank(cur.healthStatus) > this.statusRank(prev.healthStatus)
      if (downgrade) {
        anomalies.push({
          date: cur.date,
          type: 'status_downgrade',
          description: `Health status downgraded from ${prev.healthStatus} to ${cur.healthStatus}.`,
          severity: cur.healthStatus === 'critical' ? 'high' : 'medium',
        })
      }
    }

    // sustained decline > 5 days (simple: last 5 consecutive deltas negative)
    if (snapshots.length >= 6) {
      const last = snapshots.slice(-6)
      const isSustainedDecline = last.slice(1).every((s, idx) => s.healthScore < last[idx].healthScore)
      if (isSustainedDecline) {
        anomalies.push({
          date: last[last.length - 1].date,
          type: 'sustained_decline',
          description: 'Health score has declined for more than 5 consecutive snapshots.',
          severity: 'medium',
        })
      }
    }

    return anomalies
  }

  async getHealthTrendResponse(buildingId: string, days: number) {
    const building = await Building.findByPk(buildingId, { attributes: ['id', 'buildingName'] })
    if (!building) throw new Error('Building not found')

    const snapshots = await this.getSnapshots(buildingId, days)
    const trend = await this.analyzeTrend(buildingId, days)
    const anomalies = await this.detectAnomalies(buildingId, days)

    const currentScore = snapshots.length ? snapshots[snapshots.length - 1].healthScore : 0

    return {
      buildingId,
      buildingName: building.buildingName,
      currentScore,
      snapshots,
      trend,
      anomalies,
    }
  }

  async getHealthOverview(days: number) {
    const buildings = await Building.findAll({ attributes: ['id', 'buildingName'] })

    const results = [] as Array<{
      buildingId: string
      buildingName: string
      currentScore: number
      currentStatus: 'healthy' | 'moderate' | 'critical'
      scoreChange7Day: number
      trend: TrendDirection
    }>

    for (const b of buildings) {
      const snapshots = await this.getSnapshots(b.id, days)
      const trend = await this.analyzeTrend(b.id, days)

      const last = snapshots[snapshots.length - 1]
      const first = snapshots[0]

      const currentScore = last?.healthScore ?? 0
      const currentStatus = last?.healthStatus ?? 'moderate'
      const scoreChange = snapshots.length >= 2 ? currentScore - (first?.healthScore ?? currentScore) : 0

      results.push({
        buildingId: b.id,
        buildingName: b.buildingName,
        currentScore,
        currentStatus,
        scoreChange7Day: Number(scoreChange.toFixed(2)),
        trend: trend.direction,
      })
    }

    return results
  }

  async correlation(buildingId: string, days: number) {
    const snapshots = await this.getSnapshots(buildingId, days)

    const dates = snapshots.map((s) => s.date)
    const energyEfficiency = snapshots.map((s) => s.components.energyEfficiency)
    const occupancyEfficiency = snapshots.map((s) => s.components.occupancyEfficiency)

    const corr = this.pearson(energyEfficiency, occupancyEfficiency)
    const insight = this.correlationInsight(corr)

    return { dates, energyEfficiency, occupancyEfficiency, correlation: Number(corr.toFixed(4)), insight }
  }

  private pearson(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length)
    if (n < 2) return 0

    const xs = x.slice(0, n)
    const ys = y.slice(0, n)

    const meanX = xs.reduce((s, v) => s + v, 0) / n
    const meanY = ys.reduce((s, v) => s + v, 0) / n

    let num = 0
    let denX = 0
    let denY = 0

    for (let i = 0; i < n; i++) {
      const dx = xs[i] - meanX
      const dy = ys[i] - meanY
      num += dx * dy
      denX += dx * dx
      denY += dy * dy
    }

    const den = Math.sqrt(denX * denY)
    return den === 0 ? 0 : num / den
  }

  private correlationInsight(c: number): string {
    const abs = Math.abs(c)
    if (abs < 0.2) return 'Weak correlation between occupancy efficiency and energy efficiency.'
    if (abs < 0.5) return c > 0 ? 'Moderate positive correlation: higher occupancy tends to align with higher energy efficiency.' : 'Moderate negative correlation: higher occupancy tends to align with lower energy efficiency.'
    return c > 0 ? 'Strong positive correlation detected between occupancy efficiency and energy efficiency.' : 'Strong negative correlation detected between occupancy efficiency and energy efficiency.'
  }

  private statusRank(s: 'healthy' | 'moderate' | 'critical'): number {
    if (s === 'healthy') return 0
    if (s === 'moderate') return 1
    return 2
  }
}

export const healthSnapshotService = new HealthSnapshotService()

import { iriEngine } from '@/services/iriEngine'
import { fetchAllBuildingMetrics } from '@/services/api/metricsService'
import { fetchBuildings, fetchMaintenance } from '@/services/mockData'
import type { Building, BuildingMetrics, MaintenanceRecord } from '@/types'
import type { PowerGrid } from '@/types/gridModel'
import type { Recommendation } from '@/types/recommendationModel'

export interface SystemReport {
  metadata: {
    generatedAt: string
    reportType: 'comprehensive' | 'executive' | 'technical'
    version: string
  }
  summary: {
    totalBuildings: number
    totalCapacity: number
    currentOccupancy: number
    utilizationRate: number
    infrastructureRiskIndex: number
    criticalAlerts: number
    pendingMaintenance: number
  }
  buildings: Array<{
    id: string
    name: string
    type: string
    capacity: number
    occupancyRate: number
    estOccupancy: number
    baseEnergyLoad: number
    floors: number
    rooms: number
  }>
  healthScores: BuildingMetrics[]
  gridStatus: {
    totalCapacity: number
    totalLoad: number
    utilization: number
    backupActive: boolean
  }
  maintenance: MaintenanceRecord[]
  recommendations: Recommendation[]
  alerts: Array<{ id: string; severity: string; title: string; message: string }>
}

const KEYS = {
  grid: 'i2sf_power_grid_v1',
  recommendations: 'i2sf_recommendations_v1',
} as const

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function estimateCapacity(b: Building) {
  const rooms = typeof b.totalRooms === 'number' ? b.totalRooms : 0
  return Math.max(0, Math.round(rooms * 40))
}

function estimateOccupancy(b: Building) {
  const cap = estimateCapacity(b)
  const rate = typeof b.occupancyRate === 'number' ? b.occupancyRate : 0
  return Math.max(0, Math.round((rate / 100) * cap))
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export class ReportExportService {
  public async generateComprehensiveReport(): Promise<SystemReport> {
    const [buildings, maintenance, metrics] = await Promise.all([fetchBuildings(), fetchMaintenance(), fetchAllBuildingMetrics()])

    const grid = safeParse<PowerGrid | null>(localStorage.getItem(KEYS.grid), null)
    const recs = safeParse<any[]>(localStorage.getItem(KEYS.recommendations), [])

    const iri = iriEngine.calculateIRI().overallIRI

    const totalCapacity = buildings.reduce((sum, b) => sum + estimateCapacity(b), 0)
    const currentOccupancy = buildings.reduce((sum, b) => sum + estimateOccupancy(b), 0)
    const utilizationRate = totalCapacity > 0 ? (currentOccupancy / totalCapacity) * 100 : 0

    const criticalAlerts = metrics.filter((m) => m.healthStatus === 'critical').length
    const pendingMaintenance = maintenance.filter((m) => m.status === 'pending' || m.status === 'in_progress').length

    const report: SystemReport = {
      metadata: {
        generatedAt: new Date().toISOString(),
        reportType: 'comprehensive',
        version: '1.0.0',
      },
      summary: {
        totalBuildings: buildings.length,
        totalCapacity,
        currentOccupancy,
        utilizationRate: Math.round(utilizationRate * 10) / 10,
        infrastructureRiskIndex: iri,
        criticalAlerts,
        pendingMaintenance,
      },
      buildings: buildings.map((b) => ({
        id: b.id,
        name: b.buildingName,
        type: b.buildingType,
        capacity: estimateCapacity(b),
        occupancyRate: typeof b.occupancyRate === 'number' ? Math.round(b.occupancyRate * 10) / 10 : 0,
        estOccupancy: estimateOccupancy(b),
        baseEnergyLoad: typeof b.baseEnergyLoad === 'number' ? b.baseEnergyLoad : 0,
        floors: typeof b.totalFloors === 'number' ? b.totalFloors : 0,
        rooms: typeof b.totalRooms === 'number' ? b.totalRooms : 0,
      })),
      healthScores: metrics,
      gridStatus: {
        totalCapacity: typeof grid?.totalCapacity === 'number' ? grid.totalCapacity : 0,
        totalLoad: typeof grid?.totalLoad === 'number' ? grid.totalLoad : 0,
        utilization: typeof grid?.utilization === 'number' ? Math.round(clamp(grid.utilization, 0, 100) * 10) / 10 : 0,
        backupActive: Boolean(grid?.backupPower?.active),
      },
      maintenance,
      recommendations: recs as Recommendation[],
      alerts: [],
    }

    return report
  }

  public exportAsJSON(report: SystemReport): void {
    download(`infrastructure_report_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(report, null, 2), 'application/json')
  }

  public exportAsText(report: SystemReport): void {
    download(`infrastructure_report_${new Date().toISOString().slice(0, 10)}.txt`, this.formatAsText(report), 'text/plain')
  }

  private formatAsText(report: SystemReport): string {
    const lines: string[] = []

    lines.push('=================================================================')
    lines.push('INTELLIGENT INFRASTRUCTURE SIMULATION FRAMEWORK')
    lines.push('COMPREHENSIVE SYSTEM REPORT')
    lines.push('=================================================================')
    lines.push('')

    lines.push(`Generated: ${new Date(report.metadata.generatedAt).toLocaleString()}`)
    lines.push(`Version: ${report.metadata.version}`)
    lines.push('')

    lines.push('-----------------------------------------------------------------')
    lines.push('EXECUTIVE SUMMARY')
    lines.push('-----------------------------------------------------------------')
    lines.push('')
    lines.push(`Total Buildings: ${report.summary.totalBuildings}`)
    lines.push(`Total Capacity: ${report.summary.totalCapacity} students (estimated)`)
    lines.push(`Current Occupancy: ${report.summary.currentOccupancy} students (estimated)`)
    lines.push(`Utilization Rate: ${report.summary.utilizationRate.toFixed(1)}%`)
    lines.push(`Infrastructure Risk Index (IRI): ${report.summary.infrastructureRiskIndex}/100`)
    lines.push(`Critical Building Alerts: ${report.summary.criticalAlerts}`)
    lines.push(`Pending Maintenance: ${report.summary.pendingMaintenance}`)
    lines.push('')

    lines.push('-----------------------------------------------------------------')
    lines.push('GRID STATUS')
    lines.push('-----------------------------------------------------------------')
    lines.push('')
    lines.push(`Total Capacity: ${report.gridStatus.totalCapacity} kW`)
    lines.push(`Current Load: ${report.gridStatus.totalLoad} kW`)
    lines.push(`Utilization: ${report.gridStatus.utilization.toFixed(1)}%`)
    lines.push(`Backup Power: ${report.gridStatus.backupActive ? 'ACTIVE' : 'Standby'}`)
    lines.push('')

    lines.push('-----------------------------------------------------------------')
    lines.push('BUILDING INVENTORY')
    lines.push('-----------------------------------------------------------------')
    lines.push('')

    for (const [idx, b] of report.buildings.entries()) {
      lines.push(`${idx + 1}. ${b.name} (${b.type})`) 
      lines.push(`   Floors: ${b.floors} | Rooms: ${b.rooms}`)
      lines.push(`   Capacity: ${b.capacity} | Occupancy: ${b.estOccupancy} (${b.occupancyRate.toFixed(1)}%)`)
      lines.push(`   Base Energy Load: ${b.baseEnergyLoad} kW`)
      lines.push('')
    }

    lines.push('-----------------------------------------------------------------')
    lines.push('MAINTENANCE (Open Items)')
    lines.push('-----------------------------------------------------------------')
    lines.push('')

    const open = report.maintenance
      .filter((m) => m.status === 'pending' || m.status === 'in_progress')
      .slice()
      .sort((a, b) => {
        const s = (p: string) => (p === 'critical' ? 4 : p === 'high' ? 3 : p === 'medium' ? 2 : 1)
        return s(String(b.priority)) - s(String(a.priority))
      })

    if (!open.length) {
      lines.push('No open maintenance records.')
      lines.push('')
    } else {
      for (const m of open.slice(0, 20)) {
        lines.push(`- [${m.priority.toUpperCase()}] ${m.targetName} (${m.status})`) 
        lines.push(`  ${m.issueDescription}`)
      }
      lines.push('')
    }

    lines.push('-----------------------------------------------------------------')
    lines.push('RECOMMENDATIONS (Top 10)')
    lines.push('-----------------------------------------------------------------')
    lines.push('')

    const recs = (report.recommendations ?? []).slice(0, 10)
    if (!recs.length) {
      lines.push('No recommendations available.')
      lines.push('')
    } else {
      for (const r of recs) {
        lines.push(`- [${String((r as any).severity ?? 'info').toUpperCase()}] ${(r as any).title ?? 'Recommendation'}`)
      }
      lines.push('')
    }

    lines.push('=================================================================')
    lines.push('END OF REPORT')
    lines.push('=================================================================')

    return lines.join('\n')
  }
}

export const reportExportService = new ReportExportService()

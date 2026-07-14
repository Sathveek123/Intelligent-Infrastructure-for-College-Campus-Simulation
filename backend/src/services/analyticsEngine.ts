import { Op, fn, col } from 'sequelize'
import Building from '../models/Building'
import MaintenanceRecord from '../models/MaintenanceRecord'
import OccupancyRecord from '../models/OccupancyRecord'
import Room from '../models/Room'
import SimulationRun from '../models/SimulationRun'

export async function getOccupancyTrend(buildingId?: string, dateRange?: { start: Date; end: Date }) {
  const where: Record<string, unknown> = {}
  if (buildingId) where.buildingId = buildingId
  if (dateRange) where.recordDate = { [Op.between]: [dateRange.start.toISOString().slice(0, 10), dateRange.end.toISOString().slice(0, 10)] }

  const rows = await OccupancyRecord.findAll({
    where,
    attributes: ['recordDate', [fn('AVG', col('occupancyRate')), 'averageOccupancy']],
    group: ['recordDate'],
    order: [['recordDate', 'ASC']],
  })

  return rows.map((r) => {
    const json = r.toJSON() as any
    return { date: json.recordDate, averageOccupancy: Number(json.averageOccupancy ?? 0) }
  })
}

export async function getEnergyTrend(buildingId?: string, dateRange?: { start: Date; end: Date }) {
  if (!dateRange) return []

  const start = dateRange.start.toISOString().slice(0, 10)
  const end = dateRange.end.toISOString().slice(0, 10)

  const where: Record<string, unknown> = {
    simulationType: 'energy',
    createdAt: { [Op.between]: [new Date(`${start}T00:00:00.000Z`), new Date(`${end}T23:59:59.999Z`)] },
  }
  if (buildingId) where.buildingId = buildingId

  const rows = await SimulationRun.findAll({
    where,
    attributes: [[fn('date', col('createdAt')), 'date'], [fn('AVG', col('totalEnergyConsumption')), 'avgEnergy']],
    group: [fn('date', col('createdAt'))],
    order: [[fn('date', col('createdAt')), 'ASC']],
  })

  return rows.map((r) => {
    const json = r.toJSON() as any
    return {
      date: String(json.date),
      totalEnergy: Number(json.avgEnergy ?? 0),
    }
  })
}

export async function getMaintenanceTrend(dateRange?: { start: Date; end: Date }) {
  const where: Record<string, unknown> = {}
  if (dateRange) {
    where.maintenanceDate = {
      [Op.between]: [dateRange.start.toISOString().slice(0, 10), dateRange.end.toISOString().slice(0, 10)],
    }
  }

  const rows = await MaintenanceRecord.findAll({
    where,
    attributes: [
      [fn('strftime', '%Y-%m', col('maintenanceDate')), 'month'],
      [fn('COUNT', col('id')), 'totalMaintenances'],
      [fn('AVG', col('cost')), 'avgCost'],
    ],
    group: ['month'],
    order: [['month', 'ASC']],
  })

  return rows.map((r) => {
    const json = r.toJSON() as any
    return {
      month: String(json.month),
      totalMaintenances: Number(json.totalMaintenances ?? 0),
      avgCost: Number(json.avgCost ?? 0),
    }
  })
}

export async function getUtilizationHeatmap() {
  const rooms = await Room.findAll({ include: [{ model: Building, as: 'building' }] })

  return rooms.map((r) => {
    const json = r.toJSON() as any
    const capacity = Number(json.capacity ?? 0)
    const current = Number(json.currentOccupancy ?? 0)
    const utilizationRate = capacity > 0 ? (current / capacity) * 100 : 0

    return {
      buildingId: String(json.buildingId),
      buildingName: String(json.building?.buildingName ?? ''),
      roomId: String(json.id),
      roomNumber: String(json.roomNumber),
      utilizationRate: Number(utilizationRate.toFixed(2)),
    }
  })
}

export async function getBuildingComparison() {
  const buildings = await Building.findAll()

  const results = [] as Array<{ buildingId: string; buildingName: string; avgOccupancy: number; totalEnergy: number; maintenanceCount: number }>

  for (const b of buildings) {
    const rooms = await Room.findAll({ where: { buildingId: b.id } })
    const totalCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0)
    const currentOccupancy = rooms.reduce((sum, r) => sum + (r.currentOccupancy ?? 0), 0)
    const avgOccupancy = totalCapacity > 0 ? (currentOccupancy / totalCapacity) * 100 : 0

    const maintenanceCount = await MaintenanceRecord.count({ where: { buildingId: b.id } })

    const energyRow = await SimulationRun.findOne({
      where: { buildingId: b.id, simulationType: 'energy' },
      attributes: [[fn('AVG', col('totalEnergyConsumption')), 'avgEnergy']],
    })

    const energyJson = energyRow?.toJSON() as any
    const totalEnergy = Number(energyJson?.avgEnergy ?? 0)

    results.push({
      buildingId: b.id,
      buildingName: b.buildingName,
      avgOccupancy: Number(avgOccupancy.toFixed(2)),
      totalEnergy: Number(totalEnergy.toFixed(2)),
      maintenanceCount,
    })
  }

  return results
}

export async function getDashboardSummary() {
  const totalBuildings = await Building.count()
  const totalRooms = await Room.count()

  const rooms = await Room.findAll()
  const totalCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0)
  const currentOccupancy = rooms.reduce((sum, r) => sum + (r.currentOccupancy ?? 0), 0)
  const currentOccupancyRate = totalCapacity > 0 ? (currentOccupancy / totalCapacity) * 100 : 0

  const activeMaintenanceAlerts = await MaintenanceRecord.count({
    where: {
      status: { [Op.in]: ['pending', 'in_progress'] },
      priority: { [Op.in]: ['critical', 'high'] },
    },
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sims = await SimulationRun.findAll({
    where: { simulationType: 'energy', createdAt: { [Op.gte]: today } },
    attributes: ['totalEnergyConsumption'],
  })
  const todayEnergyConsumption = sims.reduce((sum, s) => sum + Number((s as any).totalEnergyConsumption ?? 0), 0)

  return {
    totalBuildings,
    totalRooms,
    currentOccupancyRate: Number(currentOccupancyRate.toFixed(2)),
    activeMaintenanceAlerts,
    todayEnergyConsumption: Number(todayEnergyConsumption.toFixed(2)),
  }
}

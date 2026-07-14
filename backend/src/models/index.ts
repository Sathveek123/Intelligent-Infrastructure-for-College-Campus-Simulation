import sequelize from '../config/database'
import AuditLog from './AuditLog'
import Building from './Building'
import BuildingMetrics from './BuildingMetrics'
import BuildingMetricsHistory from './BuildingMetricsHistory'
import MaintenanceRecord from './MaintenanceRecord'
import OccupancyRecord from './OccupancyRecord'
import RefreshToken from './RefreshToken'
import Room from './Room'
import SimulationRun from './SimulationRun'
import User from './User'

// Associations
Building.hasMany(Room, { foreignKey: 'buildingId', as: 'rooms' })
Room.belongsTo(Building, { foreignKey: 'buildingId', as: 'building' })

Building.hasMany(SimulationRun, { foreignKey: 'buildingId', as: 'simulationRuns' })
SimulationRun.belongsTo(Building, { foreignKey: 'buildingId', as: 'building' })

Building.hasOne(BuildingMetrics, { foreignKey: 'buildingId', as: 'metrics', onDelete: 'CASCADE' })
BuildingMetrics.belongsTo(Building, { foreignKey: 'buildingId', as: 'building' })

Building.hasMany(BuildingMetricsHistory, { foreignKey: 'buildingId', as: 'metricsHistory' })
BuildingMetricsHistory.belongsTo(Building, { foreignKey: 'buildingId', as: 'building' })

Room.hasMany(MaintenanceRecord, { foreignKey: 'roomId', as: 'maintenanceRecords' })
MaintenanceRecord.belongsTo(Room, { foreignKey: 'roomId', as: 'room' })

Building.hasMany(MaintenanceRecord, { foreignKey: 'buildingId', as: 'maintenanceRecords' })
MaintenanceRecord.belongsTo(Building, { foreignKey: 'buildingId', as: 'building' })

User.hasMany(MaintenanceRecord, { foreignKey: 'createdBy', as: 'maintenanceCreated' })
MaintenanceRecord.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' })

User.hasMany(SimulationRun, { foreignKey: 'createdBy', as: 'simulationRuns' })
SimulationRun.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' })

User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' })
RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' })

User.hasMany(AuditLog, { foreignKey: 'actorId', as: 'auditLogs' })
AuditLog.belongsTo(User, { foreignKey: 'actorId', as: 'actor' })

Room.hasMany(OccupancyRecord, { foreignKey: 'roomId', as: 'occupancyRecords' })
OccupancyRecord.belongsTo(Room, { foreignKey: 'roomId', as: 'room' })

Building.hasMany(OccupancyRecord, { foreignKey: 'buildingId', as: 'occupancyRecords' })
OccupancyRecord.belongsTo(Building, { foreignKey: 'buildingId', as: 'building' })

export const db = {
  sequelize,
  AuditLog,
  User,
  Building,
  BuildingMetrics,
  BuildingMetricsHistory,
  Room,
  MaintenanceRecord,
  SimulationRun,
  OccupancyRecord,
  RefreshToken,
}

export default db

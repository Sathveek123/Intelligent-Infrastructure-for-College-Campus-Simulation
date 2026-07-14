import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from 'sequelize'
import sequelize from '../config/database'

export type MaintenancePriority = 'critical' | 'high' | 'medium' | 'low'
export type MaintenanceStatus = 'pending' | 'in_progress' | 'completed'
export type PredictionSource = 'health_score' | 'stress_analysis' | 'occupancy_threshold' | 'energy_threshold'

class MaintenanceRecord extends Model<InferAttributes<MaintenanceRecord>, InferCreationAttributes<MaintenanceRecord>> {
  declare id: CreationOptional<string>
  declare roomId: CreationOptional<string | null>
  declare buildingId: CreationOptional<string | null>
  declare maintenanceDate: string
  declare issueDescription: string
  declare resolution: CreationOptional<string | null>
  declare priority: MaintenancePriority
  declare status: CreationOptional<MaintenanceStatus>
  declare cost: CreationOptional<number | null>
  declare isPredicted: CreationOptional<boolean>
  declare predictedReason: CreationOptional<string | null>
  declare predictedAt: CreationOptional<Date | null>
  declare predictionConfidence: CreationOptional<number | null>
  declare predictionSource: CreationOptional<PredictionSource | null>

  declare isDismissed: CreationOptional<boolean>
  declare dismissedBy: CreationOptional<string | null>
  declare dismissedAt: CreationOptional<Date | null>
  declare dismissalReason: CreationOptional<string | null>

  declare createdBy: CreationOptional<string | null>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}

MaintenanceRecord.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    roomId: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
    },
    buildingId: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
    },
    maintenanceDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    issueDescription: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    resolution: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    priority: {
      type: DataTypes.ENUM('critical', 'high', 'medium', 'low'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    cost: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      defaultValue: null,
    },
    isPredicted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    predictedReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    predictedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    predictionConfidence: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: null,
      validate: { min: 0, max: 100 },
    },
    predictionSource: {
      type: DataTypes.ENUM('health_score', 'stress_analysis', 'occupancy_threshold', 'energy_threshold'),
      allowNull: true,
      defaultValue: null,
    },
    isDismissed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    dismissedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    dismissedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    dismissalReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'maintenance_records',
  },
)

export default MaintenanceRecord

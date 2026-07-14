import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize'
import sequelize from '../config/database'

export type SnapshotType = 'daily' | 'manual' | 'post_simulation'

class BuildingMetricsHistory extends Model<InferAttributes<BuildingMetricsHistory>, InferCreationAttributes<BuildingMetricsHistory>> {
  declare id: CreationOptional<string>
  declare buildingId: string

  declare healthScore: number
  declare healthStatus: 'healthy' | 'moderate' | 'critical'

  declare occupancyEfficiency: number
  declare energyEfficiency: number
  declare maintenanceHealth: number

  declare recordedAt: string
  declare snapshotType: SnapshotType

  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}

BuildingMetricsHistory.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    buildingId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'buildings',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    healthScore: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    healthStatus: {
      type: DataTypes.ENUM('healthy', 'moderate', 'critical'),
      allowNull: false,
    },
    occupancyEfficiency: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    energyEfficiency: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    maintenanceHealth: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    recordedAt: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    snapshotType: {
      type: DataTypes.ENUM('daily', 'manual', 'post_simulation'),
      allowNull: false,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'building_metrics_history',
    timestamps: true,
    indexes: [
      { fields: ['buildingId', 'recordedAt'] },
      { fields: ['healthStatus'] },
      { fields: ['recordedAt'] },
    ],
  },
)

export default BuildingMetricsHistory

import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from 'sequelize'
import sequelize from '../config/database'

export type HealthStatus = 'healthy' | 'moderate' | 'critical'

class BuildingMetrics extends Model<InferAttributes<BuildingMetrics>, InferCreationAttributes<BuildingMetrics>> {
  declare id: CreationOptional<string>
  declare buildingId: string

  declare averageOccupancyEfficiency: CreationOptional<number>
  declare averageEnergyEfficiency: CreationOptional<number>
  declare maintenanceHealthScore: CreationOptional<number>
  declare overallHealthScore: CreationOptional<number>
  declare healthStatus: CreationOptional<HealthStatus>

  declare calculatedAt: CreationOptional<Date>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}

BuildingMetrics.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    buildingId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'buildings',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    averageOccupancyEfficiency: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 },
    },
    averageEnergyEfficiency: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 },
    },
    maintenanceHealthScore: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 },
    },
    overallHealthScore: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 },
    },
    healthStatus: {
      type: DataTypes.ENUM('healthy', 'moderate', 'critical'),
      allowNull: false,
      defaultValue: 'moderate',
    },
    calculatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'building_metrics',
    timestamps: true,
    indexes: [{ fields: ['buildingId'] }, { fields: ['healthStatus'] }, { fields: ['calculatedAt'] }],
  },
)

export default BuildingMetrics

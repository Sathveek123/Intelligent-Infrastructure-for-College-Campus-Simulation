import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from 'sequelize'
import sequelize from '../config/database'

export type SimulationType = 'occupancy' | 'energy' | 'stress_test'
export type StressLevel = 'low' | 'medium' | 'high'

class SimulationRun extends Model<InferAttributes<SimulationRun>, InferCreationAttributes<SimulationRun>> {
  declare id: CreationOptional<string>
  declare buildingId: CreationOptional<string | null>
  declare simulationType: SimulationType
  declare inputParameters: Record<string, unknown>
  declare outputResults: Record<string, unknown>
  declare totalStudents: CreationOptional<number | null>
  declare totalEnergyConsumption: CreationOptional<number | null>
  declare averageOccupancyRate: CreationOptional<number | null>
  declare stressLevel: CreationOptional<StressLevel | null>
  declare createdBy: string
  declare createdAt: CreationOptional<Date>
}

SimulationRun.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    buildingId: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
    },
    simulationType: {
      type: DataTypes.ENUM('occupancy', 'energy', 'stress_test'),
      allowNull: false,
    },
    inputParameters: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    outputResults: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    totalStudents: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    totalEnergyConsumption: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      defaultValue: null,
    },
    averageOccupancyRate: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      defaultValue: null,
    },
    stressLevel: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      allowNull: true,
      defaultValue: null,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    createdAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'simulation_runs',
    updatedAt: false,
  },
)

export default SimulationRun

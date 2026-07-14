import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from 'sequelize'
import sequelize from '../config/database'

class OccupancyRecord extends Model<InferAttributes<OccupancyRecord>, InferCreationAttributes<OccupancyRecord>> {
  declare id: CreationOptional<string>
  declare roomId: string
  declare buildingId: string
  declare recordDate: string
  declare timeSlot: string
  declare studentCount: number
  declare occupancyRate: number
  declare createdAt: CreationOptional<Date>
}

OccupancyRecord.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    roomId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    buildingId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    recordDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    timeSlot: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    studentCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    occupancyRate: {
      type: DataTypes.DECIMAL,
      allowNull: false,
    },
    createdAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'occupancy_records',
    updatedAt: false,
  },
)

export default OccupancyRecord

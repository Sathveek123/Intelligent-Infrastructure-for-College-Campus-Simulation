import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from 'sequelize'
import sequelize from '../config/database'

export type RoomType = 'classroom' | 'lab' | 'seminar_hall' | 'hostel_room' | 'office'
export type RoomStatus = 'available' | 'occupied' | 'maintenance'

class Room extends Model<InferAttributes<Room>, InferCreationAttributes<Room>> {
  declare id: CreationOptional<string>
  declare buildingId: string
  declare roomNumber: string
  declare floor: number
  declare capacity: number
  declare roomType: RoomType
  declare equipmentList: CreationOptional<string | null>
  declare status: CreationOptional<RoomStatus>
  declare currentOccupancy: CreationOptional<number>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}

Room.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    buildingId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    roomNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    floor: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    roomType: {
      type: DataTypes.ENUM('classroom', 'lab', 'seminar_hall', 'hostel_room', 'office'),
      allowNull: false,
    },
    equipmentList: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    status: {
      type: DataTypes.ENUM('available', 'occupied', 'maintenance'),
      allowNull: false,
      defaultValue: 'available',
    },
    currentOccupancy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'rooms',
    indexes: [{ unique: true, fields: ['buildingId', 'roomNumber'] }],
  },
)

export default Room

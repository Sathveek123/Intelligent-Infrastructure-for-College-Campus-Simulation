import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from 'sequelize'
import sequelize from '../config/database'

export type BuildingType = 'academic' | 'administrative' | 'hostel' | 'laboratory'

class Building extends Model<InferAttributes<Building>, InferCreationAttributes<Building>> {
  declare id: CreationOptional<string>
  declare buildingName: string
  declare buildingCode: string
  declare totalFloors: number
  declare totalRooms: number
  declare constructionYear: number
  declare buildingType: BuildingType
  declare baseEnergyLoad: CreationOptional<number>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}

Building.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    buildingName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    buildingCode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    totalFloors: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    totalRooms: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    constructionYear: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    buildingType: {
      type: DataTypes.ENUM('academic', 'administrative', 'hostel', 'laboratory'),
      allowNull: false,
    },
    baseEnergyLoad: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'buildings',
  },
)

export default Building

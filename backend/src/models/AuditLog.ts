import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize'
import sequelize from '../config/database'

export type AuditActorRole = 'admin' | 'staff' | 'system'

export type AuditAction =
  | 'login'
  | 'logout'
  | 'failed_login'
  | 'create'
  | 'update'
  | 'delete'
  | 'read'
  | 'simulation_run'
  | 'metrics_calculated'
  | 'prediction_generated'
  | 'prediction_converted'
  | 'prediction_dismissed'
  | 'export_csv'
  | 'export_pdf'

export type AuditEntity =
  | 'user'
  | 'building'
  | 'room'
  | 'maintenance'
  | 'simulation'
  | 'metrics'
  | 'prediction'
  | 'audit_log'

export type AuditResult = 'success' | 'failure'

class AuditLog extends Model<InferAttributes<AuditLog>, InferCreationAttributes<AuditLog>> {
  declare id: CreationOptional<string>
  declare actorId: CreationOptional<string | null>
  declare actorEmail: CreationOptional<string | null>
  declare actorRole: AuditActorRole

  declare action: AuditAction
  declare entity: AuditEntity
  declare entityId: CreationOptional<string | null>
  declare entityName: CreationOptional<string | null>

  declare changes: CreationOptional<Record<string, unknown> | null>
  declare metadata: CreationOptional<Record<string, unknown> | null>

  declare result: CreationOptional<AuditResult>
  declare errorMessage: CreationOptional<string | null>

  declare ipAddress: CreationOptional<string | null>
  declare userAgent: CreationOptional<string | null>

  declare timestamp: CreationOptional<Date>

  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}

AuditLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    actorId: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    actorEmail: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    actorRole: {
      type: DataTypes.ENUM('admin', 'staff', 'system'),
      allowNull: false,
      defaultValue: 'system',
    },
    action: {
      type: DataTypes.ENUM(
        'login',
        'logout',
        'failed_login',
        'create',
        'update',
        'delete',
        'read',
        'simulation_run',
        'metrics_calculated',
        'prediction_generated',
        'prediction_converted',
        'prediction_dismissed',
        'export_csv',
        'export_pdf',
      ),
      allowNull: false,
    },
    entity: {
      type: DataTypes.ENUM('user', 'building', 'room', 'maintenance', 'simulation', 'metrics', 'prediction', 'audit_log'),
      allowNull: false,
    },
    entityId: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
    },
    entityName: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    changes: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
    },
    result: {
      type: DataTypes.ENUM('success', 'failure'),
      allowNull: false,
      defaultValue: 'success',
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    userAgent: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'audit_logs',
    timestamps: true,
    indexes: [
      { fields: ['actorId', 'timestamp'] },
      { fields: ['action'] },
      { fields: ['entity', 'entityId'] },
      { fields: ['timestamp'] },
      { fields: ['result'] },
    ],
  },
)

export default AuditLog

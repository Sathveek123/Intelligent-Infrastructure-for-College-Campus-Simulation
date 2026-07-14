import type { QueryInterface } from 'sequelize'

// Note: This migration file is provided for production-grade deployments.
// Your current project does not include a migration runner (sequelize-cli).

export async function up(queryInterface: QueryInterface) {
  await queryInterface.createTable('audit_logs', {
    id: { type: 'UUID', primaryKey: true, allowNull: false },
    actorId: { type: 'UUID', allowNull: true },
    actorEmail: { type: 'VARCHAR(255)', allowNull: true },
    actorRole: { type: "ENUM('admin','staff','system')", allowNull: false },
    action: {
      type: "ENUM('login','logout','failed_login','create','update','delete','read','simulation_run','metrics_calculated','prediction_generated','prediction_converted','prediction_dismissed','export_csv','export_pdf')",
      allowNull: false,
    },
    entity: { type: "ENUM('user','building','room','maintenance','simulation','metrics','prediction','audit_log')", allowNull: false },
    entityId: { type: 'UUID', allowNull: true },
    entityName: { type: 'VARCHAR(255)', allowNull: true },
    changes: { type: 'JSON', allowNull: true },
    metadata: { type: 'JSON', allowNull: true },
    result: { type: "ENUM('success','failure')", allowNull: false },
    errorMessage: { type: 'TEXT', allowNull: true },
    ipAddress: { type: 'VARCHAR(255)', allowNull: true },
    userAgent: { type: 'VARCHAR(1024)', allowNull: true },
    timestamp: { type: 'TIMESTAMP', allowNull: false },
    createdAt: { type: 'TIMESTAMP', allowNull: false },
    updatedAt: { type: 'TIMESTAMP', allowNull: false },
  })

  await queryInterface.addIndex('audit_logs', ['actorId', 'timestamp'])
  await queryInterface.addIndex('audit_logs', ['action'])
  await queryInterface.addIndex('audit_logs', ['entity', 'entityId'])
  await queryInterface.addIndex('audit_logs', ['timestamp'])
  await queryInterface.addIndex('audit_logs', ['result'])
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.dropTable('audit_logs')
}

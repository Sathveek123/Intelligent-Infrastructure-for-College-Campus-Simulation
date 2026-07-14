import type { QueryInterface } from 'sequelize'

// Note: This migration file is provided for production-grade deployments.
// Your current project does not include a migration runner (sequelize-cli).
// In development, you are using sequelize.sync({ alter: true }).

export async function up(queryInterface: QueryInterface) {
  await queryInterface.createTable('building_metrics_history', {
    id: {
      type: 'UUID',
      primaryKey: true,
      allowNull: false,
    },
    buildingId: {
      type: 'UUID',
      allowNull: false,
      references: { model: 'buildings', key: 'id' },
      onDelete: 'CASCADE',
    },
    healthScore: { type: 'DECIMAL(5,2)', allowNull: false },
    healthStatus: { type: "ENUM('healthy','moderate','critical')", allowNull: false },
    occupancyEfficiency: { type: 'DECIMAL(5,2)', allowNull: false },
    energyEfficiency: { type: 'DECIMAL(5,2)', allowNull: false },
    maintenanceHealth: { type: 'DECIMAL(5,2)', allowNull: false },
    recordedAt: { type: 'DATE', allowNull: false },
    snapshotType: { type: "ENUM('daily','manual','post_simulation')", allowNull: false },
    createdAt: { type: 'TIMESTAMP', allowNull: false },
    updatedAt: { type: 'TIMESTAMP', allowNull: false },
  })

  await queryInterface.addIndex('building_metrics_history', ['buildingId', 'recordedAt'])
  await queryInterface.addIndex('building_metrics_history', ['healthStatus'])
  await queryInterface.addIndex('building_metrics_history', ['recordedAt'])
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.dropTable('building_metrics_history')
}

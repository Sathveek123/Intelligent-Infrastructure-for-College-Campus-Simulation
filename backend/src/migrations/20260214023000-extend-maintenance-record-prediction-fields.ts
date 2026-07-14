import type { QueryInterface } from 'sequelize'

export async function up(queryInterface: QueryInterface, Sequelize: any) {
  await queryInterface.changeColumn('maintenance_records', 'createdBy', {
    type: Sequelize.UUID,
    allowNull: true,
  })

  await queryInterface.addColumn('maintenance_records', 'isPredicted', {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })

  await queryInterface.addColumn('maintenance_records', 'predictedReason', {
    type: Sequelize.TEXT,
    allowNull: true,
  })

  await queryInterface.addColumn('maintenance_records', 'predictedAt', {
    type: Sequelize.DATE,
    allowNull: true,
  })

  await queryInterface.addColumn('maintenance_records', 'predictionConfidence', {
    type: Sequelize.DECIMAL(5, 2),
    allowNull: true,
  })

  await queryInterface.addColumn('maintenance_records', 'predictionSource', {
    type: Sequelize.ENUM('health_score', 'stress_analysis', 'occupancy_threshold', 'energy_threshold'),
    allowNull: true,
  })

  await queryInterface.addColumn('maintenance_records', 'isDismissed', {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })

  await queryInterface.addColumn('maintenance_records', 'dismissedBy', {
    type: Sequelize.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })

  await queryInterface.addColumn('maintenance_records', 'dismissedAt', {
    type: Sequelize.DATE,
    allowNull: true,
  })

  await queryInterface.addColumn('maintenance_records', 'dismissalReason', {
    type: Sequelize.TEXT,
    allowNull: true,
  })
}

export async function down(queryInterface: QueryInterface, Sequelize: any) {
  await queryInterface.removeColumn('maintenance_records', 'dismissalReason')
  await queryInterface.removeColumn('maintenance_records', 'dismissedAt')
  await queryInterface.removeColumn('maintenance_records', 'dismissedBy')
  await queryInterface.removeColumn('maintenance_records', 'isDismissed')
  await queryInterface.removeColumn('maintenance_records', 'predictionSource')
  await queryInterface.removeColumn('maintenance_records', 'predictionConfidence')
  await queryInterface.removeColumn('maintenance_records', 'predictedAt')
  await queryInterface.removeColumn('maintenance_records', 'predictedReason')
  await queryInterface.removeColumn('maintenance_records', 'isPredicted')

  await queryInterface.changeColumn('maintenance_records', 'createdBy', {
    type: Sequelize.UUID,
    allowNull: false,
  })

  // Postgres cleanup: the ENUM type might remain after dropping the column
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (queryInterface.sequelize.getDialect() === 'postgres') {
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_maintenance_records_predictionSource";')
  }
}

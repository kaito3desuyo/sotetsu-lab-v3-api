module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.createTable('operation_sightings', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      formation_id: {
        allowNull: false,
        type: Sequelize.UUID
      },
      operation_id: {
        allowNull: false,
        type: Sequelize.UUID
      },
      sighting_time: {
        allowNull: false,
        type: Sequelize.DATE
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    }),
  down: (queryInterface, Sequelize) =>
    queryInterface.dropTable('operation_sightings')
}

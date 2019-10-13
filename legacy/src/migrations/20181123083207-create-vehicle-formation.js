module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.createTable('vehicle_formations', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      formation_id: {
        type: Sequelize.UUID
      },
      vehicle_id: {
        type: Sequelize.UUID
      },
      car_number: {
        type: Sequelize.SMALLINT
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
    queryInterface.dropTable('vehicle_formations')
}

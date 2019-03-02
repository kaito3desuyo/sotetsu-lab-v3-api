module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.createTable('route_systems', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      route_id: {
        type: Sequelize.UUID
      },
      service_id: {
        type: Sequelize.UUID
      },
      sequence: {
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
  down: (queryInterface, Sequelize) => queryInterface.dropTable('route_systems')
}

module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.createTable('route_station_lists', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      route_id: {
        type: Sequelize.UUID
      },
      station_id: {
        type: Sequelize.UUID
      },
      station_sequence: {
        type: Sequelize.SMALLINT
      },
      station_numbering: {
        type: Sequelize.STRING
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
    queryInterface.dropTable('route_station_lists')
}

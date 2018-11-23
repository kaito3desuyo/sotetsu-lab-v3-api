module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.createTable('stops', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      station_id: {
        type: Sequelize.UUID
      },
      stop_name: {
        type: Sequelize.STRING
      },
      stop_description: {
        type: Sequelize.TEXT
      },
      stop_latlng: {
        type: Sequelize.GEOMETRY
      },
      zone_id: {
        type: Sequelize.INTEGER
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
  down: (queryInterface, Sequelize) => queryInterface.dropTable('stops')
}

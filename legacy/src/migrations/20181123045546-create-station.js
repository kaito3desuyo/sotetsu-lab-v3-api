module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.createTable('stations', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      station_name: {
        type: Sequelize.STRING
      },
      station_subname: {
        type: Sequelize.STRING
      },
      station_type: {
        type: Sequelize.SMALLINT
      },
      station_description: {
        type: Sequelize.TEXT
      },
      station_latlng: {
        type: Sequelize.GEOMETRY
      },
      station_url: {
        type: Sequelize.STRING
      },
      wheelchair_boarding: {
        type: Sequelize.BOOLEAN
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
  down: (queryInterface, Sequelize) => queryInterface.dropTable('stations')
}

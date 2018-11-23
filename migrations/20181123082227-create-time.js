module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.createTable('times', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      trip_id: {
        type: Sequelize.UUID
      },
      station_id: {
        type: Sequelize.UUID
      },
      stop_id: {
        type: Sequelize.UUID
      },
      stop_sequence: {
        type: Sequelize.INTEGER
      },
      pickup_type: {
        type: Sequelize.SMALLINT
      },
      dropoff_type: {
        type: Sequelize.SMALLINT
      },
      arrival_days: {
        type: Sequelize.INTEGER
      },
      arrival_time: {
        type: Sequelize.TIME
      },
      departure_days: {
        type: Sequelize.INTEGER
      },
      departure_time: {
        type: Sequelize.TIME
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
  down: (queryInterface, Sequelize) => queryInterface.dropTable('times')
}

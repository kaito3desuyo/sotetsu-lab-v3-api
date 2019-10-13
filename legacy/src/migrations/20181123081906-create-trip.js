module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.createTable('trips', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      service_id: {
        type: Sequelize.UUID
      },
      operation_id: {
        type: Sequelize.UUID
      },
      trip_number: {
        type: Sequelize.STRING
      },
      trip_class_id: {
        type: Sequelize.UUID
      },
      trip_name: {
        type: Sequelize.STRING
      },
      trip_direction: {
        type: Sequelize.SMALLINT
      },
      block_id: {
        type: Sequelize.STRING
      },
      calender_id: {
        type: Sequelize.UUID
      },
      extra_calender_id: {
        type: Sequelize.UUID
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
  down: (queryInterface, Sequelize) => queryInterface.dropTable('trips')
}

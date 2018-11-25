module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.createTable('trip_classes', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      service_id: {
        type: Sequelize.UUID
      },
      trip_class_name: {
        type: Sequelize.STRING
      },
      trip_class_color: {
        type: Sequelize.STRING
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
  down: (queryInterface, Sequelize) => queryInterface.dropTable('trip_classes')
}

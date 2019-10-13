module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.createTable('operations', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      calender_id: {
        type: Sequelize.UUID
      },
      operation_number: {
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
  down: (queryInterface, Sequelize) => queryInterface.dropTable('operations')
}

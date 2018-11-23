module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.createTable('services', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      service_name: {
        type: Sequelize.STRING
      },
      service_description: {
        type: Sequelize.TEXT
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
  down: (queryInterface, Sequelize) => queryInterface.dropTable('services')
}

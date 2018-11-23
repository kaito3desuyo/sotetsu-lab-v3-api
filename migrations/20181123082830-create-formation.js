module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.createTable('formations', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      agency_id: {
        type: Sequelize.UUID
      },
      vehicle_type: {
        type: Sequelize.STRING
      },
      formation_number: {
        type: Sequelize.STRING
      },
      formation_description: {
        type: Sequelize.TEXT
      },
      start_date: {
        type: Sequelize.DATEONLY
      },
      end_date: {
        type: Sequelize.DATEONLY
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
  down: (queryInterface, Sequelize) => queryInterface.dropTable('formations')
}

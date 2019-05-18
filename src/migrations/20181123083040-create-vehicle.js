module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.createTable('vehicles', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      formation_id: {
        type: Sequelize.UUID
      },
      vehicle_number: {
        type: Sequelize.STRING,
        unique: true
      },
      belongs: {
        type: Sequelize.STRING
      },
      production_date: {
        type: Sequelize.DATEONLY
      },
      scrapped_date: {
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
  down: (queryInterface, Sequelize) => queryInterface.dropTable('vehicles')
}

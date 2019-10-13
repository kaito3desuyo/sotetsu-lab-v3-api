module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.createTable('calenders', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      service_id: {
        type: Sequelize.UUID
      },
      calender_name: {
        type: Sequelize.STRING
      },
      sunday: {
        type: Sequelize.BOOLEAN
      },
      monday: {
        type: Sequelize.BOOLEAN
      },
      tuesday: {
        type: Sequelize.BOOLEAN
      },
      wednesday: {
        type: Sequelize.BOOLEAN
      },
      thursday: {
        type: Sequelize.BOOLEAN
      },
      friday: {
        type: Sequelize.BOOLEAN
      },
      saturday: {
        type: Sequelize.BOOLEAN
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
  down: (queryInterface, Sequelize) => queryInterface.dropTable('calenders')
}

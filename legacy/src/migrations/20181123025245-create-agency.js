module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.createTable('agencies', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      agency_number: {
        type: Sequelize.STRING
      },
      parent_agency_number: {
        type: Sequelize.STRING
      },
      agency_official_name: {
        type: Sequelize.STRING
      },
      agency_name: {
        type: Sequelize.STRING
      },
      agency_type: {
        type: Sequelize.SMALLINT
      },
      agency_url: {
        type: Sequelize.STRING
      },
      agency_phone: {
        type: Sequelize.STRING
      },
      agency_fare_url: {
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
  down: (queryInterface, Sequelize) => queryInterface.dropTable('agencies')
}

module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.createTable('routes', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      agency_id: {
        type: Sequelize.UUID
      },
      route_number: {
        type: Sequelize.STRING
      },
      route_name: {
        type: Sequelize.STRING
      },
      route_nickname: {
        type: Sequelize.STRING
      },
      route_description: {
        type: Sequelize.TEXT
      },
      route_type: {
        type: Sequelize.SMALLINT
      },
      route_url: {
        type: Sequelize.STRING
      },
      route_color: {
        type: Sequelize.STRING
      },
      route_text_color: {
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
  down: (queryInterface, Sequelize) => queryInterface.dropTable('routes')
}

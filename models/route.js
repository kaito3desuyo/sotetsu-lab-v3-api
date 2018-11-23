module.exports = (sequelize, DataTypes) => {
  const route = sequelize.define(
    'route',
    {
      id: {
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      agency_id: DataTypes.UUID,
      route_number: DataTypes.STRING,
      route_name: DataTypes.STRING,
      route_nickname: DataTypes.STRING,
      route_description: DataTypes.TEXT,
      route_type: DataTypes.TINYINT,
      route_url: DataTypes.STRING,
      route_color: DataTypes.STRING,
      route_text_color: DataTypes.STRING
    },
    {
      underscored: true
    }
  )
  route.associate = function(models) {
    // associations can be defined here
    route.belongsTo(models.agency, { foreignKey: 'agency_id' })
    route.belongsToMany(models.service, {
      through: 'route_systems'
    })
    route.hasMany(models.route_station_list, {
      foreignKey: 'route_id'
    })
    /*
    route.belongsToMany(models.station, {
      through: 'route_station_lists'
    })
    */
  }
  return route
}

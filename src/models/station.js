module.exports = (sequelize, DataTypes) => {
  const station = sequelize.define(
    'station',
    {
      id: {
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      station_name: DataTypes.STRING,
      station_subname: DataTypes.STRING,
      station_type: DataTypes.SMALLINT,
      station_description: DataTypes.TEXT,
      station_latlng: DataTypes.GEOMETRY,
      station_url: DataTypes.STRING,
      wheelchair_boarding: DataTypes.BOOLEAN
    },
    {
      underscored: true
    }
  )
  station.associate = models => {
    // associations can be defined here
    station.hasMany(models.stop, { foreignKey: 'station_id' })
    station.hasMany(models.route_station_list, { foreignKey: 'station_id' })
    station.hasMany(models.time, { foreignKey: 'station_id' })
    /* station.belongsToMany(models.route, {
      through: 'route_station_lists'
    }) */
  }
  return station
}

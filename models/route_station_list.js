module.exports = (sequelize, DataTypes) => {
  const routeStationList = sequelize.define(
    'route_station_list',
    {
      id: {
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      route_id: DataTypes.UUID,
      station_id: DataTypes.UUID,
      station_sequence: DataTypes.SMALLINT,
      station_numbering: DataTypes.STRING
    },
    {
      underscored: true
    }
  )
  routeStationList.associate = function(models) {
    // associations can be defined here
    routeStationList.belongsTo(models.route, { foreignKey: 'route_id' })
    routeStationList.belongsTo(models.station, { foreignKey: 'station_id' })
  }
  return routeStationList
}

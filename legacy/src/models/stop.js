module.exports = (sequelize, DataTypes) => {
  const stop = sequelize.define(
    'stop',
    {
      id: {
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      station_id: DataTypes.UUID,
      stop_name: DataTypes.STRING,
      stop_description: DataTypes.TEXT,
      stop_latlng: DataTypes.GEOMETRY,
      zone_id: DataTypes.INTEGER
    },
    {
      underscored: true
    }
  )
  stop.associate = models => {
    // associations can be defined here
  }
  return stop
}

module.exports = (sequelize, DataTypes) => {
  const time = sequelize.define(
    'time',
    {
      id: {
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      trip_id: DataTypes.UUID,
      station_id: DataTypes.UUID,
      stop_id: DataTypes.UUID,
      stop_sequence: DataTypes.INTEGER,
      pickup_type: DataTypes.SMALLINT,
      dropoff_type: DataTypes.SMALLINT,
      arrival_days: DataTypes.INTEGER,
      arrival_time: DataTypes.TIME,
      departure_days: DataTypes.INTEGER,
      departure_time: DataTypes.TIME
    },
    {
      underscored: true
    }
  )
  time.associate = models => {
    // associations can be defined here
  }
  return time
}

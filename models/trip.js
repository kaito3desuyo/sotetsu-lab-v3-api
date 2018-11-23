module.exports = (sequelize, DataTypes) => {
  const trip = sequelize.define(
    'trip',
    {
      id: {
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      service_id: DataTypes.UUID,
      operation_id: DataTypes.UUID,
      trip_number: DataTypes.STRING,
      trip_class_id: DataTypes.UUID,
      trip_name: DataTypes.STRING,
      trip_direction: DataTypes.SMALLINT,
      block_id: DataTypes.STRING,
      calender_id: DataTypes.UUID,
      extra_calender_id: DataTypes.UUID
    },
    {
      underscored: true
    }
  )
  trip.associate = function(models) {
    // associations can be defined here
    trip.hasMany(models.time, { foreignKey: 'trip_id' })
  }
  return trip
}

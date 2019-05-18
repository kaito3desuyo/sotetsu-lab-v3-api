module.exports = (sequelize, DataTypes) => {
  const tripClass = sequelize.define(
    'trip_class',
    {
      id: {
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      service_id: DataTypes.UUID,
      trip_class_name: DataTypes.STRING,
      trip_class_color: DataTypes.STRING,
      sequence: DataTypes.SMALLINT
    },
    {
      underscored: true
    }
  )
  tripClass.associate = models => {
    // associations can be defined here
  }
  return tripClass
}

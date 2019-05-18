module.exports = (sequelize, DataTypes) => {
  const vehicle = sequelize.define(
    'vehicle',
    {
      id: {
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      formation_id: DataTypes.UUID,
      vehicle_number: DataTypes.STRING,
      belongs: DataTypes.STRING,
      production_date: DataTypes.DATEONLY,
      scrapped_date: DataTypes.DATEONLY
    },
    {
      underscored: true
    }
  )
  vehicle.associate = models => {
    // associations can be defined here
    vehicle.hasMany(models.vehicle_formation, { foreignKey: 'vehicle_id' })
  }
  return vehicle
}

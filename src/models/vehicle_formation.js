module.exports = (sequelize, DataTypes) => {
  const vehicleFormation = sequelize.define(
    'vehicle_formation',
    {
      id: {
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      formation_id: DataTypes.UUID,
      vehicle_id: DataTypes.UUID,
      car_number: DataTypes.SMALLINT
    },
    {
      underscored: true
    }
  )
  vehicleFormation.associate = models => {
    // associations can be defined here
    vehicleFormation.belongsTo(models.vehicle, { foreignKey: 'vehicle_id' })
    vehicleFormation.belongsTo(models.formation, { foreignKey: 'formation_id' })
  }
  return vehicleFormation
}

module.exports = (sequelize, DataTypes) => {
  const formation = sequelize.define(
    'formation',
    {
      id: {
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      agency_id: DataTypes.UUID,
      vehicle_type: DataTypes.STRING,
      formation_number: DataTypes.STRING,
      formation_description: DataTypes.TEXT,
      start_date: DataTypes.DATEONLY,
      end_date: DataTypes.DATEONLY
    },
    {
      underscored: true
    }
  )
  formation.associate = models => {
    // associations can be defined here
    formation.hasMany(models.vehicle_formation, { foreignKey: 'formation_id' }),
      formation.hasMany(models.operation_sighting, {
        foreignKey: 'formation_id'
      })
  }
  return formation
}
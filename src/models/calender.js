module.exports = (sequelize, DataTypes) => {
  const calender = sequelize.define(
    'calender',
    {
      id: {
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      service_id: DataTypes.UUID,
      calender_name: DataTypes.STRING,
      sunday: DataTypes.BOOLEAN,
      monday: DataTypes.BOOLEAN,
      tuesday: DataTypes.BOOLEAN,
      wednesday: DataTypes.BOOLEAN,
      thursday: DataTypes.BOOLEAN,
      friday: DataTypes.BOOLEAN,
      saturday: DataTypes.BOOLEAN,
      start_date: DataTypes.DATEONLY,
      end_date: DataTypes.DATEONLY
    },
    {
      underscored: true
    }
  )
  calender.associate = models => {
    // associations can be defined here
    calender.hasMany(models.operation, { foreignKey: 'calender_id' })
    calender.belongsTo(models.service, { foreignKey: 'service_id' })
  }
  return calender
}

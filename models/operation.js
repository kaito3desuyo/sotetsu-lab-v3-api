module.exports = (sequelize, DataTypes) => {
  const operation = sequelize.define(
    'operation',
    {
      id: {
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      calender_id: DataTypes.UUID,
      operation_number: DataTypes.STRING
    },
    {
      underscored: true
    }
  )
  operation.associate = function(models) {
    // associations can be defined here
    operation.belongsTo(models.calender, { foreignKey: 'calender_id' })
    operation.hasMany(models.trip, { foreignKey: 'operation_id' })
  }
  return operation
}

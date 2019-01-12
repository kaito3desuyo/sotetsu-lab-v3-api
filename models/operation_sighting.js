module.exports = (sequelize, DataTypes) => {
  const operationSighting = sequelize.define(
    'operation_sighting',
    {
      id: {
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      formation_id: DataTypes.UUID,
      operation_id: DataTypes.UUID,
      sighting_time: DataTypes.DATE
    },
    {
      underscored: true
    }
  )
  operationSighting.associate = function(models) {
    // associations can be defined here
    operationSighting.belongsTo(models.formation, {
      foreignKey: 'formation_id'
    })
    operationSighting.belongsTo(models.operation, {
      foreignKey: 'operation_id'
    })
  }
  return operationSighting
}

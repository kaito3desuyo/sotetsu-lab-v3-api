module.exports = (sequelize, DataTypes) => {
  const routeSystem = sequelize.define(
    'route_system',
    {
      id: {
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      route_id: DataTypes.UUID,
      service_id: DataTypes.UUID,
      sequence: DataTypes.SMALLINT
    },
    {
      underscored: true
    }
  )
  routeSystem.associate = models => {
    // associations can be defined here
  }
  return routeSystem
}

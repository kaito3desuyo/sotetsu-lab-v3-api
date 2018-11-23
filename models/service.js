module.exports = (sequelize, DataTypes) => {
  const service = sequelize.define(
    'service',
    {
      id: {
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      service_name: DataTypes.STRING,
      service_description: DataTypes.TEXT
    },
    {
      underscored: true
    }
  )
  service.associate = function(models) {
    // associations can be defined here
    service.belongsToMany(models.route, {
      through: 'route_systems'
    })
    service.hasMany(models.calender, {
      foreignKey: 'service_id'
    })
  }
  return service
}

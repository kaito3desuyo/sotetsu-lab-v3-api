module.exports = (sequelize, DataTypes) => {
  const agency = sequelize.define(
    'agency',
    {
      id: {
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      agency_number: DataTypes.STRING,
      parent_agency_number: DataTypes.STRING,
      agency_official_name: DataTypes.STRING,
      agency_name: DataTypes.STRING,
      agency_type: DataTypes.TINYINT,
      agency_url: DataTypes.STRING,
      agency_phone: DataTypes.STRING,
      agency_fare_url: DataTypes.STRING
    },
    {
      underscored: true
    }
  )
  agency.associate = models => {
    // associations can be defined here
    agency.hasMany(models.route, { foreignKey: 'agency_id' })
  }
  return agency
}

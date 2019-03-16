import Sequelize from 'sequelize'

require('dotenv').config()
const env = process.env.NODE_ENV || 'development'
const config = require(`./../config/config.json`)[env]
const db = {}

let sequelize
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config)
} else {
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  )
}

const context = require.context('.', true, /^\.\/(?!index\.js).*\.js$/, 'sync')
context
  .keys()
  .map(context)
  .forEach(module => {
    const sequelizeModel = module(sequelize, Sequelize)
    db[sequelizeModel.name] = sequelizeModel
  })

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db)
  }
})

db.sequelize = sequelize
db.Sequelize = Sequelize

export default db

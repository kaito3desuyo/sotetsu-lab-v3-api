import * as express from 'express'
import db from './../../models'

const router = express.Router()

const Sequelize = require('sequelize')

const Op = Sequelize.Op

const moment = require('moment')
require('moment-timezone')
moment.tz.setDefault('Asia/Tokyo')

/* GET users listing. */
router.get('/', (req, res, next) => {
  db.vehicle
    .findAll({
      include: [
        {
          model: db.vehicle_formation,
          required: true,
          include: [
            {
              model: db.formation,
              required: true
            }
          ]
        }
      ],
      order: [['vehicle_number', 'ASC']]
    })
    .then(result => {
      res.json(result)
    })
})

router.get('/number/:number', (req, res, next) => {
  const today = moment()
  if (Number(moment().format('H')) < 3) {
    today.subtract(1, 'days')
  }

  db.vehicle
    .findAll({
      include: [
        {
          model: db.vehicle_formation,
          required: true,
          include: [
            {
              model: db.formation,
              required: true,
              where: {
                [Op.and]: {
                  start_date: {
                    [Op.or]: {
                      [Op.lte]: today.format('YYYYMMDD'),
                      [Op.eq]: null
                    }
                  },
                  end_date: {
                    [Op.or]: {
                      [Op.gte]: today.format('YYYYMMDD'),
                      [Op.eq]: null
                    }
                  }
                }
              }
            }
          ]
        }
      ],
      where: {
        vehicle_number: req.params.number
      }
    })
    .then(result => {
      res.json(result)
    })
})

export default router
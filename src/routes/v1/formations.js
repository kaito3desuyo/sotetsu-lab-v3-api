import * as express from 'express'
import db from './../../models'
import * as moment from 'moment'

const Sequelize = require('sequelize')
const Op = Sequelize.Op

const router = express.Router()
/* GET users listing. */
router.get('/', (req, res, next) => {
  db.formation
    .findAll({
      include: [
        {
          model: db.vehicle_formation,
          required: true,
          include: [
            {
              model: db.vehicle,
              required: true
            }
          ]
        }
        /*
        {
          model: db.operation_sighting,
          required: false,
          include: [
            {
              model: db.operation,
              required: true
            }
          ]
        }
        */
      ],
      where: {
        start_date: {
          [Op.or]: {
            [Op.lt]: moment().format('YYYY-MM-DD'),
            [Op.eq]: null
          }
        },
        end_date: {
          [Op.or]: {
            [Op.gt]: moment().format('YYYY-MM-DD'),
            [Op.eq]: null
          }
        }
      },
      order: [
        [
          db.sequelize.fn(
            'to_number',
            db.sequelize.col('formation_number'),
            '99999'
          ),
          'ASC'
        ],
        [db.formation.associations.vehicle_formations, 'car_number', 'ASC']
        // [db.formation.associations.operation_sightings, 'sighting_time', 'DESC']
      ]
    })
    .then(result => {
      res.json(result)
    })
})

export default router

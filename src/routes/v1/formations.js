import * as express from 'express'
import db from './../../models'

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
        },
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
      ],
      order: [
        ['formation_number', 'ASC'],
        [db.formation.associations.vehicle_formations, 'car_number', 'ASC'],
        [db.formation.associations.operation_sightings, 'sighting_time', 'DESC']
      ]
    })
    .then(result => {
      res.json(result)
    })
})

export default router

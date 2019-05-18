import * as express from 'express'

import db from './../../models'

const router = express.Router()

/* GET users listing. */
router.get('/', (req, res, next) => {
  db.route
    .findAll({
      include: [
        {
          model: db.service,
          required: true
        },
        {
          model: db.route_station_list,
          required: true,
          include: {
            model: db.station,
            required: true,
            include: {
              model: db.route_station_list,
              required: true,
              include: {
                model: db.route,
                required: true
              }
            }
          }
        }
      ],
      order: [
        ['route_number', 'ASC'],
        [db.route.associations.route_station_lists, 'station_sequence', 'ASC']
      ]
    })
    .then(result => {
      res.json(result)
    })
})

export default router

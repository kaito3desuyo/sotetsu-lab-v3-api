import * as express from 'express'

import db from './../../models'

const router = express.Router()

/* GET users listing. */
router.get('/', (req, res, next) => {
  db.service
    .findAll({
      include: [
        {
          model: db.route,
          required: true
        },
        {
          model: db.calender,
          required: true
        },
        {
          model: db.trip_class,
          required: false
        }
      ],
      order: [
        [db.service.associations.routes, 'route_number', 'ASC'],
        [db.service.associations.calenders, 'start_date', 'ASC']
      ]
    })
    .then(result => {
      res.send(result)
    })
})

export default router

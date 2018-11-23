const express = require('express')

const router = express.Router()

const db = require('../../models')

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
      res.send(result)
    })
})

module.exports = router

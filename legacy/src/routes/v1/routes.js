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

router.get('/stations', (req, res) => {
  db.route
    .findAll({
      include: [
        {
          model: db.route_station_list,
          required: true,
          include: {
            model: db.station,
            required: true
          }
        }
      ]
    })
    .then(result => {
      const returnArray = []
      result.forEach(element => {
        switch (element.route_name) {
          case '本線':
            returnArray[0] = element
            break
          case 'いずみ野線':
            returnArray[1] = element
            break
          case '新横浜線':
            returnArray[2] = element
            break
          case '厚木線':
            returnArray[3] = element
            break
          case '埼京線':
            returnArray[4] = element
            break
          case '川越線':
            returnArray[5] = element
            break
        }
      })
      res.json(returnArray)
    })
})

export default router

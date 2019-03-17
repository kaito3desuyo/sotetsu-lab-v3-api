import * as express from 'express'
import * as _ from 'lodash'

import db from './../../models'

const router = express.Router()

/* GET users listing. */
router.get('/a', (req, res, next) => {
  db.station
    .findAll({
      include: [
        {
          model: db.stop,
          required: true
        },
        {
          model: db.route_station_list,
          required: true,
          include: [
            {
              model: db.route,
              required: true
            }
          ]
        }
      ],
      order: [
        [
          db.station.associations.route_station_lists,
          db.route_station_list.associations.route,
          'route_number',
          'ASC'
        ],
        [db.station.associations.route_station_lists, 'station_sequence', 'ASC']
      ]
    })
    .then(result => {
      res.json(result)
    })
})

router.get('/', async (req, res, next) => {
  const orders = [
    '川越線',
    '埼京線',
    '新横浜線',
    '本線',
    'いずみ野線',
    '厚木線'
  ]
  db.station
    .findAll({
      include: [
        {
          model: db.route_station_list,
          required: true,
          include: [
            {
              model: db.route,
              required: true
            }
          ]
        }
      ],
      order: [
        [
          db.station.associations.route_station_lists,
          db.route_station_list.associations.route,
          'route_number',
          'ASC'
        ],
        [db.station.associations.route_station_lists, 'station_sequence', 'ASC']
      ]
    })
    .then(result => {
      let stations = []
      const connectStationId = []
      let nishiya = null

      const routeStations = orders.map(lineName => {
        return result.filter(sta => {
          return _.some(
            sta.route_station_lists,
            route => route.route.route_name === lineName
          )
        })
      })

      routeStations.forEach((elem, index) => {
        switch (index) {
          case 0:
          case 1:
          case 2:
          case 5:
            elem.forEach(element => {
              if (
                !_.some(connectStationId, id => id === element.id) &&
                _.some(element.route_station_lists, routeStation =>
                  _.includes(
                    orders.filter(value => value !== orders[index]),
                    routeStation.route.route_name
                  )
                )
              ) {
                connectStationId.push(element.id)
                return true
              }
              stations.push(element)
            })
            break
          case 3:
            elem.forEach(element => {
              if (element.station_name === '西谷') {
                nishiya = element
                return true
              }

              stations.push(element)

              if (element.station_name === '上星川') {
                stations.push(nishiya)
              }

              if (element.station_name === '二俣川') {
                routeStations[4].forEach(element => {
                  if (
                    !_.some(connectStationId, id => id === element.id) &&
                    _.some(element.route_station_lists, routeStation =>
                      _.includes(
                        orders.filter(value => value !== orders[4]),
                        routeStation.route.route_name
                      )
                    )
                  ) {
                    connectStationId.push(element.id)
                    return true
                  }

                  stations.push(element)
                })
              }
            })
        }
      })

      if (req.query.direction === 'up') {
        stations = stations.reverse()
      }

      res.json(stations)
    })
})

export default router

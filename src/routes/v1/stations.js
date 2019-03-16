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
      orders.forEach(order => {
        const temp = result.filter(sta => {
          return _.some(
            sta.route_station_lists,
            route => route.route.route_name === order
          )
        })
        temp.forEach(sta => {
          const honsenChecker = _.some(
            sta.route_station_lists,
            route => route.route.route_name === '本線'
          )

          if (sta.station_name === '西谷') {
            nishiya = sta
            return true
          }

          if (_.includes(connectStationId, sta.id)) {
            return true
          }
          if (
            _.some(sta.route_station_lists, routeStation =>
              _.includes(
                orders.filter(value => value !== order),
                routeStation.route.route_name
              )
            )
          ) {
            connectStationId.push(sta.id)
          }

          stations.push(sta)

          if (sta.station_name === '上星川') {
            stations.push(nishiya)
          }
        })
      })

      if (req.query.direction === 'up') {
        stations = stations.reverse()
      }

      res.json(stations)
    })
  /*
  const arrays = order.map((name: string) => {
    return new Promise((resolve, reject) => {
      db.station
        .findAll({
          include: [
            {
              model: db.route_station_list,
              required: true,
              include: [
                {
                  model: db.route,
                  required: true,
                  where: {
                    route_name: name
                  }
                }
              ]
            }
          ],
          order: [[db.station.associations.route_station_lists, 'station_sequence', 'ASC']]
        })
        .then(result => {
          resolve(result)
        })
    })
  })
  
  await Promise.all(arrays).then(result => {
    const routeAndStations = result.map((obj: any) => {
      // console.log(obj)
      return obj
    })

    const stations = []
    routeAndStations.forEach((stas: any, index: number) => {
      console.log('Index', order[index])
      stas.forEach(sta => {
        stations.push(sta)
      })
    })

    res.json(stations)
  })
  */
})

export default router

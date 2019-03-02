import * as express from 'express'

const router = express.Router()

const db = require('../../models')

/* GET users listing. */
router.get('/', (req, res, next) => {
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
              required: true,
              include: [
                {
                  model: db.route_station_list,
                  required: true,
                  include: [
                    {
                      model: db.station,
                      required: true
                    }
                  ]
                },
                {
                  model: db.agency,
                  required: true,
                  where: {
                    agency_name: '相鉄'
                  }
                }
              ]
            }
          ]
        }
      ],
      order: [
        [db.station.associations.route_station_lists, db.route_station_list.associations.route, 'route_number', 'ASC'],
        [db.station.associations.route_station_lists, 'station_sequence', 'ASC']
      ]
    })
    .then(result => {
      console.log(req.query)
      const Izumino = result.filter(item => item.route_station_lists[0].route.route_name === 'いずみ野線')
      const Main = result.filter(item => item.route_station_lists[0].route.route_name === '本線')
      const Atsugi = result.filter(item => item.route_station_lists[0].route.route_name === '厚木線')

      const Futamatagawa = Main.findIndex(item => item.route_station_lists.length > 1 && item.route_station_lists[1].route.route_name === 'いずみ野線')

      Array.prototype.splice.apply(Main, [Futamatagawa + 1, 0].concat(Izumino))

      const Kashiwadai = Main.findIndex(item => item.route_station_lists.length > 1 && item.route_station_lists[1].route.route_name === '厚木線')

      Array.prototype.splice.apply(Main, [Kashiwadai + 2, 0].concat(Atsugi))

      let resultArray = Main
      if (req.query.direction === 'up') {
        resultArray = resultArray.reverse()
      }
      res.json(resultArray)
    })
})

export default router

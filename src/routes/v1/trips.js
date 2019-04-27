import * as _ from 'lodash'
import Sequelize from 'sequelize'
import * as express from 'express'
import * as moment from 'moment'

import db from './../../models'

const router = express.Router()
const Op = Sequelize.Op

const timetableData = require('../../mock-data/operation_table_20181208.json')

/* GET users listing. */
router.get('/', (req, res, next) => {
  db.trip
    .findAll({
      include: [
        {
          model: db.time,
          required: false
        },
        {
          model: db.operation,
          required: false
        },
        {
          model: db.calender,
          required: true,
          where: {
            id: req.query.calender_id
          }
        },
        {
          model: db.trip_class,
          required: true
        }
      ],
      where: {
        trip_direction:
          req.query.direction === 'up'
            ? 0
            : req.query.direction === 'down'
            ? 1
            : null
      },
      order: [
        [db.trip.associations.times, 'departure_days', 'ASC'],
        [db.trip.associations.times, 'departure_time', 'ASC']
      ]
    })
    .then(result => {
      const returnArray = []
      console.log('カウント', req.query)
      const offset = Number(req.query.offset)
      const count = Number(req.query.count)
      result.forEach((element, index) => {
        if (index >= offset * count && index < (offset + 1) * count) {
          returnArray.push(element)
        }
      })

      res.json(returnArray)
    })
})

router.get('/count', (req, res, next) => {
  db.trip
    .count({
      include: [
        {
          model: db.calender,
          required: true,
          where: {
            id: req.query.calender_id
          }
        }
      ],
      where: {
        trip_direction:
          req.query.direction === 'up'
            ? 0
            : req.query.direction === 'down'
            ? 1
            : null
      }
    })
    .then(result => {
      res.json(result)
    })
})

router.get('/:id', (req, res, next) => {
  db.trip
    .findOne({
      include: [
        {
          model: db.time,
          required: false
        },
        {
          model: db.operation,
          required: false
        },
        {
          model: db.calender,
          required: true,
          where: {
            id: req.query.calender_id
          }
        },
        {
          model: db.trip_class,
          required: true
        }
      ],
      where: {
        id: req.params.id,
        trip_direction:
          req.query.direction === 'up'
            ? 0
            : req.query.direction === 'down'
            ? 1
            : null
      },
      order: [
        [db.trip.associations.times, 'departure_days', 'ASC'],
        [db.trip.associations.times, 'departure_time', 'ASC']
      ]
    })
    .then(result => {
      res.json(result)
    })
})

router.post('/', (req, res, next) => {
  console.log('列車追加', req.body)
  db.trip
    .create(req.body.trip, {
      include: [
        {
          model: db.time,
          required: true
        }
      ]
    })
    .then(result => {
      res.json(result)
    })
})

router.put('/:id', async (req, res, next) => {
  console.log('編集します', req.params.id, req.body.trip)
  const updatedTrip = await db.trip.update(req.body.trip, {
    where: {
      id: req.params.id
    }
  })

  const deletedOldTimes = await db.time.destroy({
    where: {
      trip_id: req.params.id
    }
  })

  const times = _.map(req.body.trip.times, obj => {
    return {
      ...obj,
      trip_id: req.params.id
    }
  })

  const createdNewTimes = await db.time.bulkCreate(times)

  res.json({
    status: 'success'
  })
})

router.get('/mock/importer', async (req, res, next) => {
  const serviceId = await getServiceId('相鉄本線・いずみ野線')

  const calenderIdTemp = {
    weekday: await getCalenderId(serviceId.service_id, '平日ダイヤ'),
    holiday: await getCalenderId(serviceId.service_id, '土休日ダイヤ')
  }

  const operationIdTemp = {
    weekday: {},
    holiday: {}
  }

  const classIdTemp = {}

  const stationList = [
    { name: '横浜', numbering: 'SO01' },
    { name: '平沼橋', numbering: 'SO02' },
    { name: '西横浜', numbering: 'SO03' },
    { name: '天王町', numbering: 'SO04' },
    { name: '星川', numbering: 'SO05' },
    { name: '和田町', numbering: 'SO06' },
    { name: '上星川', numbering: 'SO07' },
    { name: '西谷', numbering: 'SO08' },
    { name: '鶴ヶ峰', numbering: 'SO09' },
    { name: '二俣川', numbering: 'SO10' },
    { name: '希望ヶ丘', numbering: 'SO11' },
    { name: '三ツ境', numbering: 'SO12' },
    { name: '瀬谷', numbering: 'SO13' },
    { name: '大和', numbering: 'SO14' },
    { name: '相模大塚', numbering: 'SO15' },
    { name: 'さがみ野', numbering: 'SO16' },
    { name: 'かしわ台', numbering: 'SO17' },
    { name: '海老名', numbering: 'SO18' },
    { name: '南万騎が原', numbering: 'SO31' },
    { name: '緑園都市', numbering: 'SO32' },
    { name: '弥生台', numbering: 'SO33' },
    { name: 'いずみ野', numbering: 'SO34' },
    { name: 'いずみ中央', numbering: 'SO35' },
    { name: 'ゆめが丘', numbering: 'SO36' },
    { name: '湘南台', numbering: 'SO37' },
    { name: '厚木', numbering: 'SO41' }
  ]

  const stationIdTemp = await Promise.all(
    stationList.map(async station => {
      return {
        ...station,
        ...(await getStationId(station.name))
      }
    })
  )

  const mockData = await Promise.all(
    timetableData
      .filter(obj => {
        return obj.operation_id && obj.train_id
      })
      .map(async obj => {
        const calenderId = calenderIdTemp[obj.day]

        const operationId = operationIdTemp[obj.day][obj.operation_id]
          ? await operationIdTemp[obj.day][obj.operation_id]
          : await getOperationId(calenderId.calender_id, obj.operation_id)
        operationIdTemp[obj.day][obj.operation_id] = operationId

        // console.log(operationIdTemp)
        const tripClassId = classIdTemp[obj.class]
          ? await classIdTemp[obj.class]
          : await getClassId(serviceId.service_id, obj.class)
        classIdTemp[obj.class] = tripClassId

        const timeList = stationList
          .map(station => {
            const stationId = _.find(
              stationIdTemp,
              obj => obj.name === station.name
            )['station_id']
            if (obj[station.numbering]) {
              return {
                station_id: stationId,
                stop_id: null,
                arrival_days:
                  Number(
                    moment(obj[station.numbering], 'HH:mm:ss').format('H')
                  ) > 3
                    ? 1
                    : 2,
                arrival_time: obj[station.numbering],
                departure_days:
                  Number(
                    moment(obj[station.numbering], 'HH:mm:ss').format('H')
                  ) > 3
                    ? 1
                    : 2,
                departure_time: obj[station.numbering]
              }
            } else if (
              station.numbering === 'SO10' &&
              (obj[station.numbering + '_arr'] ||
                obj[station.numbering + '_dep'])
            ) {
              return {
                station_id: stationId,
                stop_id: null,
                arrival_days: obj[station.numbering + '_arr']
                  ? Number(
                      moment(
                        obj[station.numbering + '_arr'],
                        'HH:mm:ss'
                      ).format('H')
                    ) > 3
                    ? 1
                    : 2
                  : null,
                arrival_time: obj[station.numbering + '_arr'] || null,
                departure_days: obj[station.numbering + '_dep']
                  ? Number(
                      moment(
                        obj[station.numbering + '_dep'],
                        'HH:mm:ss'
                      ).format('H')
                    ) > 3
                    ? 1
                    : 2
                  : null,
                departure_time: obj[station.numbering + '_dep'] || null
              }
            } else {
              return null
            }
          })
          .filter(time => time)
          .map((station, index, array) => {
            const returnTime = {
              ...station,
              stop_sequence:
                obj.train_id % 2 === 0 ? array.length - index : index + 1,
              pickup_type: index === array.length - 1 ? 1 : 0,
              dropoff_type: index === 0 ? 1 : 0,
              arrival_days:
                obj.train_id % 2 === 0
                  ? index === array.length - 1
                    ? null
                    : station.arrival_days
                  : index === 0
                  ? null
                  : station.arrival_days,
              arrival_time:
                obj.train_id % 2 === 0
                  ? index === array.length - 1
                    ? null
                    : station.arrival_time
                  : index === 0
                  ? null
                  : station.arrival_time,
              departure_days:
                obj.train_id % 2 === 0
                  ? index === 0
                    ? null
                    : station.departure_days
                  : index === array.length - 1
                  ? null
                  : station.departure_days,
              departure_time:
                obj.train_id % 2 === 0
                  ? index === 0
                    ? null
                    : station.departure_time
                  : index === array.length - 1
                  ? null
                  : station.departure_time,
              depot_in: obj.depot_in,
              depot_out: obj.depot_out
            }
            return returnTime
          })

        return {
          service_id: serviceId.service_id,
          operation_id: operationId.operation_id,
          trip_number: String(obj.train_id),
          trip_class_id: tripClassId.trip_class_id,
          trip_name: null,
          trip_direction: obj.train_id % 2 === 0 ? 0 : 1,
          block_id: obj.operation_id + '運',
          calender_id: calenderId.calender_id,
          extra_calender_id: null,
          times: timeList
        }
      })
  )

  await Promise.all(
    mockData.map(async obj => {
      await setTrip(obj)
    })
  )

  /*
  db.trip.bulkCreate(mockData).then(result => {
    console.log(result)
  })
  */

  res.json({
    status: 'success'
  })
})

function setTrip(data) {
  return new Promise((resolve, reject) => {
    db.trip
      .create(data, {
        include: [
          {
            model: db.time
          }
        ]
      })
      .then(result => {
        resolve(result)
      })
  })
}

function getServiceId(serviceName) {
  return new Promise((resolve, reject) => {
    db.service
      .findOne({
        where: {
          service_name: serviceName
        }
      })
      .then(result => {
        resolve({
          service_id: result ? result.id : null
        })
      })
      .catch(err => {
        console.log(err)
      })
  })
}

function getCalenderId(serviceId, type) {
  return new Promise((resolve, reject) => {
    db.calender
      .findOne({
        where: {
          service_id: serviceId,
          calender_name: type,
          start_date: {
            [Op.gte]: '2018-12-08'
          }
        }
      })
      .then(result => {
        resolve({
          service_id: result.service_id,
          calender_id: result.id
        })
      })
      .catch(err => {
        console.log(err)
      })
  })
}

function getOperationId(calenderId, number) {
  return new Promise((resolve, reject) => {
    db.operation
      .findOne({
        where: {
          calender_id: calenderId,
          operation_number: number
        }
      })
      .then(result => {
        resolve({
          operation_id: result ? result.id : null
        })
      })
      .catch(err => {
        console.log(err)
      })
  })
}

function getClassId(serviceId, className) {
  return new Promise((resolve, reject) => {
    db.trip_class
      .findOne({
        where: {
          service_id: serviceId,
          trip_class_name: className
        }
      })
      .then(result => {
        resolve({
          trip_class_id: result ? result.id : null
        })
      })
      .catch(err => {
        console.log(err)
      })
  })
}

function getStationId(stationName) {
  return new Promise((resolve, reject) => {
    db.station
      .findOne({
        where: {
          station_name: stationName
        }
      })
      .then(result => {
        resolve({
          station_id: result ? result.id : null
        })
      })
      .catch(err => {
        console.log(err)
      })
  })
}

export default router

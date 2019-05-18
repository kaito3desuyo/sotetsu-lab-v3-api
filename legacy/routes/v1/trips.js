const express = require('express')

const router = express.Router()
const _ = require('lodash')
const Sequelize = require('sequelize')
const db = require('../../models')

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
          required: false
        }
      ]
    })
    .then(result => {
      res.send(result)
    })
})

router.post('/', (req, res, next) => {
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

router.get('/importer', async (req, res, next) => {
  const serviceAndCalenderId = await getCalenderId('平日ダイヤ')
  const operationId = await getOperationId(
    serviceAndCalenderId.calender_id,
    String(11)
  )

  console.log('サービス・カレンダー', serviceAndCalenderId)
  console.log('運用', operationId)

  res.send(timetableData)
})

module.exports = router

function getCalenderId(type) {
  return new Promise((resolve, reject) => {
    db.calender
      .findOne({
        where: {
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
          operation_id: result.id
        })
      })
  })
}

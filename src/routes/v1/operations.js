import * as express from 'express'
import db from './../../models'

const router = express.Router()

const axios = require('axios')
const Sequelize = require('sequelize')

const Op = Sequelize.Op

const moment = require('moment')

/* GET users listing. */
router.get('/', (req, res, next) => {
  db.operation
    .findAll({
      include: [
        {
          model: db.calender,
          required: true
        }
      ],
      order: []
    })
    .then(result => {
      res.json(result)
    })
})

/*
 * 日付指定検索
 */
router.get('/date/:date', async (req, res, next) => {
  const checkDate = await holidayCheck(req.params.date)

  let dayName = moment(req.params.date, 'YYYYMMDD')
    .format('dddd')
    .toLowerCase()

  // holiday判定のときはsundayに書き換える
  if (checkDate === 'holiday') {
    dayName = 'sunday'
  }

  db.operation
    .findAll({
      include: generateIncludeObject(dayName, req.params.date),
      where: {
        [Op.not]: {
          operation_number: '100'
        }
      },
      order: [
        ['operation_number', 'ASC']
        // [db.operation.associations.operation_sightings, 'sighting_time', 'DESC']
      ]
    })
    .then(result => {
      res.json(result)
    })
})

/**
 * CalenderIdを指定して運用ごとの列車を取得する
 */
router.get('/trips', async (req, res, next) => {
  const whereObj = req.query.calender_id ? { id: req.query.calender_id } : {}
  db.operation
    .findAll({
      include: [
        {
          model: db.calender,
          required: true,
          where: whereObj
        },
        {
          model: db.trip,
          required: true,
          include: [
            {
              model: db.time,
              required: true
            },
            {
              model: db.trip_class,
              required: true
            }
          ]
        }
      ],
      where: {
        [Op.not]: {
          operation_number: '100'
        }
      },
      order: [
        ['operation_number', 'ASC'],
        [
          db.operation.associations.trips,
          db.trip.associations.times,
          'departure_days',
          'ASC'
        ],
        [
          db.operation.associations.trips,
          db.trip.associations.times,
          'departure_time',
          'ASC'
        ]
      ]
    })
    .then(result => res.json(result))
})

/*
 * 日付+運用番号指定検索
 */
router.get('/date/:date/number/:number', async (req, res, next) => {
  const checkDate = await holidayCheck(req.params.date)

  let dayName = moment(req.params.date, 'YYYYMMDD')
    .format('dddd')
    .toLowerCase()

  // holiday判定のときはsundayに書き換える
  if (checkDate === 'holiday') {
    dayName = 'sunday'
  }

  db.operation
    .findOne({
      where: {
        operation_number: String(req.params.number)
      },
      include: generateIncludeObject(dayName, req.params.date)
    })
    .then(result => {
      res.json(result)
    })
})

/*
 * 運用目撃情報
 */
router.get('/sightings', (req, res, next) => {
  db.operation_sighting
    .findAll({
      include: [
        {
          model: db.formation,
          required: true
        },
        {
          model: db.operation,
          required: true
        }
      ],
      order: [['sighting_time', 'DESC']]
    })
    .then(result => res.json(result))
})

router.get('/sightings/formation/:number', (req, res, next) => {
  db.operation_sighting
    .findAndCountAll({
      include: [
        {
          model: db.formation,
          required: true,
          where: {
            formation_number: req.params.number
          }
        },
        {
          model: db.operation,
          required: true
        }
      ],
      order: [['sighting_time', 'DESC']],
      limit: req.query.limit || 1,
      offset: req.query.offset || 0
    })
    .then(result => res.json(result))
})

router.get('/sightings/operation/:number', (req, res, next) => {
  db.operation_sighting
    .findAndCountAll({
      include: [
        {
          model: db.formation,
          required: true
        },
        {
          model: db.operation,
          required: true,
          where: {
            operation_number: req.params.number
          }
        }
      ],
      order: [['sighting_time', 'DESC']],
      limit: req.query.limit || 1,
      offset: req.query.offset || 0
    })
    .then(result => res.json(result))
})

router.get('/sightings/latest', async (req, res, next) => {
  db.sequelize
    .query(
      `
      SELECT * FROM operation_sightings AS base 
      INNER JOIN ( SELECT formation_id, MAX(sighting_time) AS latest_sighting 
      FROM operation_sightings GROUP BY formation_id ) AS latest 
      ON base.formation_id = latest.formation_id 
      AND base.sighting_time = latest.latest_sighting 
      INNER JOIN formations ON base.formation_id = formations.id 
      INNER JOIN operations ON base.operation_id = operations.id
      WHERE formations.end_date > '${moment().format(
        'YYYY-MM-DD'
      )}' or formations.end_date IS NULL
      `,
      {
        model: db.operation_sighting,
        mapToModel: true
      }
    )
    .then(result => {
      res.json(result)
    })
})

router.post('/sightings', (req, res, next) => {
  if (
    !req.body ||
    !req.body.formationId ||
    !req.body.operationId ||
    !req.body.sightingTime
  ) {
    res.status(400).json({
      status: 'error',
      message: {
        title: 'エラー',
        text:
          '送信されたデータの形式が不正です。\n管理者にお問い合わせください。'
      }
    })
  }

  db.operation_sighting
    .create({
      formation_id: req.body.formationId,
      operation_id: req.body.operationId,
      sighting_time: req.body.sightingTime
    })
    .then(() => {
      res.status(200).json({
        status: 'success',
        message: {}
      })
    })
    .catch(() => {
      res.status(500).json({
        status: 'error',
        message: {
          title: 'エラー',
          text:
            'データベース登録に失敗しました。\n管理者にお問い合わせください。'
        }
      })
    })
})

// 休日判定
function holidayCheck(date) {
  return new Promise((resolve, reject) => {
    axios
      .get(`http://s-proj.com/utils/checkHoliday.php?kind=h&date=${date}`)
      .then(response => {
        resolve(response.data)
      })
  })
}

// includeObjectを作成
function generateIncludeObject(dayName, date) {
  return [
    {
      model: db.calender,
      required: true,
      where: {
        [dayName]: true,
        [Op.and]: {
          start_date: {
            [Op.lt]: moment(date, 'YYYYMMDD').format('YYYY-MM-DD')
          },
          end_date: {
            [Op.or]: {
              [Op.gt]: moment(date, 'YYYYMMDD').format('YYYY-MM-DD'),
              [Op.eq]: null
            }
          }
        }
      }
    }
    /*
    {
      model: db.operation_sighting,
      required: false,
      include: [
        {
          model: db.formation,
          required: false
         
          where: {
            start_date: {
              [Op.lt]: moment(date, 'YYYYMMDD').format('YYYY-MM-DD')
            },
            end_date: {
              [Op.or]: {
                [Op.gt]: moment(date, 'YYYYMMDD').format('YYYY-MM-DD'),
                [Op.eq]: null
              }
            }
          }
          
        }
      ]
    }
    */
  ]
}

export default router

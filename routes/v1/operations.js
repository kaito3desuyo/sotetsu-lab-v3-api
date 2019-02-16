const express = require('express')

const router = express.Router()

const axios = require('axios')
const Sequelize = require('sequelize')
const db = require('../../models')

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
router.get('/date/:date', (req, res, next) => {
  Promise.resolve()
    .then(() => holidayCheck(req.params.date))
    .then(checkDate => {
      let dayName = moment(req.params.date, 'YYYYMMDD')
        .format('dddd')
        .toLowerCase()

      // holiday判定のときはsundayに書き換える
      if (checkDate === 'holiday') {
        dayName = 'sunday'
      }

      return new Promise((resolve, reject) => {
        db.operation
          .findAll({
            include: generateIncludeObject(dayName, req.params.date),
            where: {
              [Op.not]: {
                operation_number: '100'
              }
            },
            order: [
              ['operation_number', 'ASC'],
              [
                db.operation.associations.operation_sightings,
                'sighting_time',
                'DESC'
              ]
            ]
          })
          .then(result => {
            res.json(result)
          })
      })
    })
})

/*
 * 日付+運用番号指定検索
 */
router.get('/date/:date/number/:number', (req, res, next) => {
  Promise.resolve()
    .then(() => holidayCheck(req.params.date))
    .then(checkDate => {
      let dayName = moment(req.params.date, 'YYYYMMDD')
        .format('dddd')
        .toLowerCase()

      // holiday判定のときはsundayに書き換える
      if (checkDate === 'holiday') {
        dayName = 'sunday'
      }

      return new Promise((resolve, reject) => {
        db.operation
          .find({
            where: {
              operation_number: String(req.params.number)
            },
            include: generateIncludeObject(dayName, req.params.date)
          })
          .then(result => {
            res.json(result)
          })
      })
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
    .findAll({
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
      order: [['sighting_time', 'DESC']]
    })
    .then(result => res.json(result))
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
    .catch(err => {
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
            [Op.lt]: moment(date, 'YYYYMMDD')
          },
          end_date: {
            [Op.or]: {
              [Op.gt]: moment(date, 'YYYYMMDD'),
              [Op.eq]: null
            }
          }
        }
      }
    },
    {
      model: db.operation_sighting,
      required: false,
      include: [
        {
          model: db.formation,
          required: false
        }
      ]
    }
  ]
}

module.exports = router

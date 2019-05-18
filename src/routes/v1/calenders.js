import * as express from 'express'
import db from './../../models'
import * as moment from 'moment'
import axios from 'axios'

const router = express.Router()

const Sequelize = require('sequelize')

const Op = Sequelize.Op

/* GET users listing. */
router.get('/', (req, res, next) => {
  db.calender
    .findAll({
      include: [
        {
          model: db.service,
          required: true,
          where: {
            service_name: '相鉄本線・いずみ野線'
          },
          include: [
            {
              model: db.trip_class,
              required: false
            }
          ]
        },
        {
          model: db.operation,
          required: false,
          where: {
            [Op.not]: {
              operation_number: '100'
            }
          }
        }
      ],
      order: [
        ['start_date', 'DESC'],
        ['calender_name', 'DESC'],
        [
          db.calender.associations.service,
          db.service.associations.trip_classes,
          'sequence',
          'ASC'
        ]
      ]
    })
    .then(result => {
      res.send(result)
    })
})

router.get('/today', async (req, res, next) => {
  let todaysDayName = moment()
    .format('dddd')
    .toLocaleLowerCase()

  const checkDate = await holidayCheck(req.params.date)

  // holiday判定のときはsundayに書き換える
  if (checkDate === 'holiday') {
    todaysDayName = 'sunday'
  }

  db.calender
    .findOne({
      where: {
        [todaysDayName]: true,

        end_date: null
      }
    })
    .then(result => {
      res.json(result)
    })
    .catch(err => {
      res.json(err)
    })
})

/**
 * 指定した日付に当てはまるカレンダーを取得する
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

  db.calender
    .findOne({
      where: {
        [dayName]: true,
        [Op.and]: {
          start_date: {
            [Op.lte]: moment(req.params.date, 'YYYYMMDD').format('YYYY-MM-DD')
          },
          end_date: {
            [Op.or]: {
              [Op.gte]: moment(req.params.date, 'YYYYMMDD').format(
                'YYYY-MM-DD'
              ),
              [Op.eq]: null
            }
          }
        }
      }
    })
    .then(result => {
      res.json(result)
    })
    .catch(err => {
      res.json(err)
    })
})

router.get('/:id', (req, res, next) => {
  db.calender
    .findOne({
      include: [
        {
          model: db.operation,
          required: false,
          where: {
            [Op.not]: {
              operation_number: '100'
            }
          }
        }
      ],
      where: {
        id: req.params.id
      },
      order: [[db.calender.associations.operations, 'operation_number', 'ASC']]
    })
    .then(result => {
      res.json(result)
    })
    .catch(err => {
      res.json(err)
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

export default router

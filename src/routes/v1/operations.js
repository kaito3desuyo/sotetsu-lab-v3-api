import * as express from 'express'
import db from './../../models'
import cron from 'node-cron'
import * as _ from 'lodash'
import cluster from 'cluster'

const router = express.Router()

const axios = require('axios')
const Sequelize = require('sequelize')

const Op = Sequelize.Op

const moment = require('moment')
require('moment-timezone')
moment.tz.setDefault('Asia/Tokyo')

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

/**
 * 運用idを指定して取得
 */
router.get('/by-id/:id', (req, res, next) => {
  db.operation
    .findOne({
      include: [
        {
          model: db.trip,
          required: false,
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
        id: req.params.id,
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
    .then(result => {
      res.json(result)
    })
})

/**
 * カレンダーidを指定して、運用一覧を取得
 */
router.get('/by-calender/:id', (req, res, next) => {
  db.operation
    .findAll({
      include: [
        {
          model: db.calender,
          required: true,
          where: {
            id: req.params.id
          }
        },
        {
          model: db.trip,
          required: false,
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
    .then(result => {
      res.json(result)
    })
})

/*
 * 日付指定検索
 */
router.get('/date/:date', async (req, res, next) => {
  const result = await getOperationsByDate(req.params.date)
  res.json(result)
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

router.get('/sightings/formation', (req, res, next) => {
  db.sequelize
    .query(
      `
      SELECT formations.id AS formation_id, formation_number, onemore.operation_id AS operation_id, operations.operation_number AS operation_number, sightings.latest_sighting AS sighting_time, sightings.latest_update AS updated_at FROM formations AS formations
      LEFT JOIN (
        SELECT formation_id, MAX(sighting_time) AS latest_sighting, MAX(updated_at) AS latest_update
        FROM operation_sightings GROUP BY formation_id
        
      ) AS sightings ON formations.id = sightings.formation_id
      LEFT JOIN (
        
          SELECT * FROM operation_sightings
        
      ) AS onemore ON formations.id = onemore.formation_id AND sightings.latest_sighting = onemore.sighting_time AND sightings.latest_update = onemore.updated_at
      LEFT JOIN (
        SELECT * FROM operations
      ) AS operations ON onemore.operation_id = operations.id
      WHERE formations.end_date >= '${moment().format(
        'YYYY-MM-DD'
      )}' or formations.end_date IS NULL
      ORDER BY to_number(formations.formation_number, '99999') ASC
      `,
      {
        model: db.formation,
        mapToModel: false
      }
    )
    .then(result => {
      res.json(result)
    })
})

router.get('/sightings/operation', async (req, res, next) => {
  const today = moment().subtract(
    Number(moment().format('H')) < 3 ? 1 : 0,
    'days'
  )
  const checkDate = await holidayCheck(today.format('YYYYMMDD'))

  let dayName = today.format('dddd').toLowerCase()

  // holiday判定のときはsundayに書き換える
  if (checkDate === 'holiday') {
    dayName = 'sunday'
  }

  db.sequelize
    .query(
      `
      SELECT operations.id AS operation_id, operation_number, onemore.formation_id AS formation_id, formations.formation_number AS formation_number, sightings.latest_sighting AS sighting_time, sightings.latest_update AS updated_at FROM operations AS operations
      LEFT JOIN (
        SELECT operation_id, MAX(sighting_time) AS latest_sighting, MAX(updated_at) AS latest_update
        FROM operation_sightings GROUP BY operation_id
        
      ) AS sightings ON operations.id = sightings.operation_id
      LEFT JOIN (
        
          SELECT * FROM operation_sightings
        
      ) AS onemore ON operations.id = onemore.operation_id AND sightings.latest_sighting = onemore.sighting_time AND sightings.latest_update = onemore.updated_at
      LEFT JOIN (
        SELECT * FROM formations
        WHERE formations.end_date >= '${today.format(
          'YYYY-MM-DD'
        )}' or formations.end_date IS NULL
      ) AS formations ON onemore.formation_id = formations.id
      INNER JOIN (
        SELECT * from calenders
      ) AS calenders ON operations.calender_id = calenders.id
      WHERE calenders.${dayName} = true 
      AND operation_number <> '100'
      AND calenders.start_date <= '${today.format('YYYY-MM-DD')}'
      AND (calenders.end_date >= '${today.format(
        'YYYY-MM-DD'
      )}' OR calenders.end_date IS NULL)
      ORDER BY operation_number ASC
      `,
      {
        model: db.operation,
        mapToModel: false
      }
    )
    .then(result => {
      res.json(result)
    })
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
      order: [['sighting_time', 'DESC'], ['updated_at', 'DESC']],
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
      order: [['sighting_time', 'DESC'], ['updated_at', 'DESC']],
      limit: req.query.limit || 1,
      offset: req.query.offset || 0
    })
    .then(result => res.json(result))
})

router.get('/sightings/latest', async (req, res, next) => {
  const result = await getLatestSightings()
  res.json(result)
})

router.post('/sightings', async (req, res, next) => {
  console.log(req.body)
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
  const registrationSighing = []

  try {
    /**
     * 同編成の前運用が同一でない場合、前運用の編成IDをNULLにする
     */
    const preFetchDuplicateFormation = await db.operation_sighting.findOne({
      where: {
        formation_id: req.body.formationId
      },
      order: [['sighting_time', 'DESC'], ['updated_at', 'DESC']]
    })

    if (
      preFetchDuplicateFormation &&
      preFetchDuplicateFormation.operation_id !== req.body.operationId &&
      preFetchDuplicateFormation.operation_id !== null
    ) {
      registrationSighing.push({
        formation_id: null,
        operation_id: preFetchDuplicateFormation.operation_id,
        sighting_time: req.body.sightingTime
      })
    }

    /**
     * 同運用の前編成が同一でない場合、前編成の運用IDをNULLにする
     */
    const preFetchDuplicateOperation = await db.operation_sighting.findOne({
      include: [
        {
          model: db.operation,
          required: true,
          where: {
            [Op.not]: {
              operation_number: '100'
            }
          }
        }
      ],
      where: {
        operation_id: req.body.operationId
      },
      order: [['sighting_time', 'DESC'], ['updated_at', 'DESC']]
    })

    if (
      preFetchDuplicateOperation &&
      preFetchDuplicateOperation.formation_id !== req.body.formationId &&
      preFetchDuplicateOperation.formation_id !== null
    ) {
      registrationSighing.push({
        formation_id: preFetchDuplicateOperation.formation_id,
        operation_id: null,
        sighting_time: req.body.sightingTime
      })
    }

    registrationSighing.push({
      formation_id: req.body.formationId,
      operation_id: req.body.operationId,
      sighting_time: req.body.sightingTime
    })

    const result = await db.operation_sighting.bulkCreate(registrationSighing)
    res.status(200).json({
      status: 'success',
      message: {}
    })
  } catch (e) {
    res.status(500).json({
      status: 'error',
      message: {
        title: 'エラー',
        text: 'データベース登録に失敗しました。\n管理者にお問い合わせください。'
      }
    })
  }
})

/**
 * 順送り処理
 */
cron.schedule(
  '0 0 2 * * *',
  // '10 * * * * *',
  () => {
    if (!cluster.isMaster) {
      console.log('このプロセスは子プロセスです。終了します')
      return
    }
    const random = Math.floor(Math.random() * 31)
    console.log('順送り処理を行います')
    setTimeout(async () => {
      console.log(random + '秒遅延実行します')

      const latest = await getLatestSightings()
      console.log('最後の目撃情報', JSON.parse(JSON.stringify(latest)))

      const isDone = _.some(JSON.parse(JSON.stringify(latest)), obj => {
        return (
          moment(obj.latest_update).format('H') === '2' &&
          moment(obj.latest_update).format('YYYY-MM-DD') ===
            moment().format('YYYY-MM-DD')
        )
      })

      if (isDone) {
        console.log('すでに順送り実行済みのため終了します')
        return
      }

      const todaysOperations = await getOperationsByDate(
        moment().format('YYYYMMDD')
      )

      const increment = operationNumber => {
        // console.log(operationNumber[1])
        if (operationNumber === '100') {
          return '100'
        }
        operationNumber = _.replace(operationNumber, /9$/, '0')
        return String(Number(operationNumber) + 1)
      }
      const incrementedData = _(JSON.parse(JSON.stringify(latest)))
        .filter(obj => obj.operation_number !== '100')
        .map(obj => {
          return {
            formation_id: obj.formation_id,
            operation_id: _.find(todaysOperations, ope => {
              return ope.operation_number === increment(obj.operation_number)
            }).id,
            sighting_time: moment() // obj.sighting_time
          }
        })
        .value()

      await db.operation_sighting.bulkCreate(incrementedData)
    }, 1000 * random)
  },
  {
    timezone: 'Asia/Tokyo'
  }
)

/**
 * 日付から運用を取得する
 * @param {*} req
 */
const getOperationsByDate = async (date, isIncludeStop = false) => {
  const checkDate = await holidayCheck(date)

  let dayName = moment(date, 'YYYYMMDD')
    .format('dddd')
    .toLowerCase()

  // holiday判定のときはsundayに書き換える
  if (checkDate === 'holiday') {
    dayName = 'sunday'
  }

  return db.operation.findAll({
    include: generateIncludeObject(dayName, date),
    where: {
      [Op.not]: {
        operation_number: isIncludeStop ? null : '100'
      }
    },
    order: [
      ['operation_number', 'ASC']
      // [db.operation.associations.operation_sightings, 'sighting_time', 'DESC']
    ]
  })
}

/**
 * 最後に目撃された情報を返す
 */
const getLatestSightings = () => {
  return db.sequelize.query(
    `
      SELECT * FROM operation_sightings AS base 
      INNER JOIN ( SELECT formation_id, MAX(sighting_time) AS latest_sighting, MAX(updated_at) AS latest_update
      FROM operation_sightings GROUP BY formation_id) AS latest 
      ON base.formation_id = latest.formation_id 
      AND base.sighting_time = latest.latest_sighting 
      INNER JOIN formations ON base.formation_id = formations.id 
      INNER JOIN operations ON base.operation_id = operations.id
      WHERE formations.end_date >= '${moment().format(
        'YYYY-MM-DD'
      )}' or formations.end_date IS NULL
      `,
    {
      model: db.operation_sighting,
      mapToModel: true
    }
  )

  // , sightings.latest_update AS updated_at
}

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
            [Op.lte]: moment(date, 'YYYYMMDD').format('YYYY-MM-DD')
          },
          end_date: {
            [Op.or]: {
              [Op.gte]: moment(date, 'YYYYMMDD').format('YYYY-MM-DD'),
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
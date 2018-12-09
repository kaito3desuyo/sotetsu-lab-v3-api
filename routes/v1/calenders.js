const express = require('express')

const router = express.Router()

const db = require('../../models')

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
          required: false
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

router.get('/:id', (req, res, next) => {
  db.calender
    .findOne({
      include: [
        {
          model: db.operation,
          required: false
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

module.exports = router

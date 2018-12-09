const express = require('express')

const router = express.Router()

const db = require('../../models')

/* GET users listing. */
router.get('/', (req, res, next) => {
  db.vehicle
    .findAll({
      include: [
        {
          model: db.vehicle_formation,
          required: true,
          include: [
            {
              model: db.formation,
              required: true
            }
          ]
        }
      ],
      order: [['vehicle_number', 'ASC']]
    })
    .then(result => {
      res.json(result)
    })
})

router.get('/byNumber/:num', (req, res, next) => {
  db.vehicle
    .findAll({
      include: [
        {
          model: db.vehicle_formation,
          required: true,
          include: [
            {
              model: db.formation,
              required: true
            }
          ]
        }
      ],
      where: {
        vehicle_number: req.params.num
      },
      order: [['vehicle_number', 'ASC']]
    })
    .then(result => {
      res.json(result)
    })
})

module.exports = router

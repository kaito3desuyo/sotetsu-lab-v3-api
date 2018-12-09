const express = require('express')

const router = express.Router()

const db = require('../../models')

/* GET users listing. */
router.get('/', (req, res, next) => {
  db.trip
    .findAll({
      include: [
        {
          model: db.time,
          required: true
        },
        {
          model: db.operation,
          required: true
        },
        {
          model: db.calender,
          required: true
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

module.exports = router

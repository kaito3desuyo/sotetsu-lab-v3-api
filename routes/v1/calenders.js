const express = require('express')

const router = express.Router()

const db = require('../../models')

/* GET users listing. */
router.get('/', (req, res, next) => {
  db.calender
    .findAll({
      include: [
        {
          model: db.operation,
          required: false
        }
      ]
    })
    .then(result => {
      res.send(result)
    })
})

module.exports = router

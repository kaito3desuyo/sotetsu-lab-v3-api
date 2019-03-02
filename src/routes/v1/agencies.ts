import * as express from 'express'

const router = express.Router()

const db = require('../../models')

/* GET users listing. */
router.get('/', (req, res, next) => {
  db.agency
    .findAll({
      include: {
        model: db.route,
        required: true
      }
    })
    .then(result => {
      res.send(result)
    })
})

export default router

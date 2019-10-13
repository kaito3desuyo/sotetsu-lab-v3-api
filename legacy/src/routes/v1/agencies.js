import * as express from 'express'
import db from './../../models'
const router = express.Router()

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

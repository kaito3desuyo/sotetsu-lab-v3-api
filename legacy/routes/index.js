const express = require('express')

const router = express.Router()

const apiV1 = require('./v1/index')

router.use('/api/v1', apiV1)

/* GET home page. */
/*
router.get('/', (req, res, next) => {
  res.render('index', { title: 'Express' })
})
*/

module.exports = router

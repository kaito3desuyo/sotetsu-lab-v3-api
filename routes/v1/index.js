const express = require('express')

const router = express.Router()

const agencies = require('./agencies')
const routes = require('./routes')
const services = require('./services')
const stations = require('./stations')
const calenders = require('./calenders')
const trips = require('./trips')

router.use('/agencies', agencies)
router.use('/routes', routes)
router.use('/services', services)
router.use('/stations', stations)
router.use('/calenders', calenders)
router.use('/trips', trips)

module.exports = router

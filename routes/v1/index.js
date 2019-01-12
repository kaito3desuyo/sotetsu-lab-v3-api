const express = require('express')

const router = express.Router()

const agencies = require('./agencies')
const routes = require('./routes')
const services = require('./services')
const stations = require('./stations')
const calenders = require('./calenders')
const trips = require('./trips')
const formations = require('./formations')
const vehicles = require('./vehicles')
const operations = require('./operations')

router.use('/agencies', agencies)
router.use('/routes', routes)
router.use('/services', services)
router.use('/stations', stations)
router.use('/calenders', calenders)
router.use('/trips', trips)
router.use('/formations', formations)
router.use('/vehicles', vehicles)
router.use('/operations', operations)

module.exports = router

import * as express from 'express'

import agencies from './agencies'
import routes from './routes'
import services from './services'
import stations from './stations'
import calenders from './calenders'
import trips from './trips'
import formations from './formations'
import vehicles from './vehicles'
import operations from './operations'
const router = express.Router()

router.use('/agencies', agencies)
router.use('/routes', routes)
router.use('/services', services)
router.use('/stations', stations)
router.use('/calenders', calenders)
router.use('/trips', trips)
router.use('/formations', formations)
router.use('/vehicles', vehicles)
router.use('/operations', operations)

export default router

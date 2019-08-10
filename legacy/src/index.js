import http from 'http'
import sticky from 'sticky-session'
import socketMiddleware from 'socket.io'
import * as express from 'express'
import * as cookieParser from 'cookie-parser'
import * as _ from 'lodash'
import bodyParser from 'body-parser'
import * as cors from 'cors'
import indexRouter from './routes/index'
import jwt from 'jsonwebtoken'
import jwkToPem from 'jwk-to-pem'

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cookieParser())
app.use(cors())

app.get('/health-check', (req, res, next) => {
  res.json({
    status: 200,
    data: {},
    message: 'Sotetsu Lab v3 API.'
  })
})

if (process.env.NODE_ENV !== 'development') {
  app.use((req, res, next) => {
    try {
      if (
        !req.header('Authorization') ||
        typeof req.header('Authorization') !== 'string'
      ) {
        next({
          status: 401,
          error: {
            type: 'Invalid Request',
            message: 'Please set Authorization header.'
          }
        })
        return
      }

      if (
        !req.header('X-APP-CLIENT-ID') ||
        typeof req.header('X-APP-CLIENT-ID') !== 'string'
      ) {
        next({
          status: 401,
          error: {
            type: 'Invalid Request',
            message: 'Please set X-APP-CLIENT-ID header.'
          }
        })
        return
      }

      const token = req.header('Authorization').split(' ')

      const decoded = jwt.decode(token[1], { complete: true })

      const jwkKeys = require('./secrets/jwks.json')
      const jwk = _.find(jwkKeys.keys, obj => obj.kid === decoded.header.kid)
      const pem = jwkToPem(jwk)

      const verify = jwt.verify(token[1], pem, {
        algorithms: ['RS256']
      })

      // subがCLIENT_IDと一致していること
      if (verify.sub !== req.header('X-APP-CLIENT-ID')) {
        throw new jwt.JsonWebTokenError('verify.sub not equal X-APP-CLIENT-ID')
      }

      // issがAWS CognitoのユーザープールIDと一致していること
      if (
        verify.iss !==
        'https://cognito-idp.ap-northeast-1.amazonaws.com/' +
          process.env.COGNITO_USERPOOL_ID
      ) {
        throw new jwt.JsonWebTokenError(
          'verify.iss not equal AWS Cognito userpoolID'
        )
      }

      // token_useがaccessになっていること
      if (verify.token_use !== 'access') {
        throw new jwt.JsonWebTokenError('verify.token_use not equal "access"')
      }

      next()
    } catch (err) {
      console.log('エラー', err)
      if (err instanceof jwt.NotBeforeError) {
        next({
          status: 401,
          error: {
            type: 'Invalid Request',
            message: 'Token has not active.'
          }
        })
      } else if (err instanceof jwt.TokenExpiredError) {
        next({
          status: 401,
          error: {
            type: 'Invalid Request',
            message: 'Token has expired.'
          }
        })
      } else if (err instanceof jwt.JsonWebTokenError) {
        next({
          status: 401,
          error: {
            type: 'Invalid Request',
            message: 'Invalid Token.'
          }
        })
      } else {
        next({
          status: 500,
          error: {
            type: 'Internal Server Error',
            message: 'Please tell administrator'
          }
        })
      }
    }
  })
}

app.use('/', indexRouter)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status).json(err)
})

const server = http.createServer(app)
const io = socketMiddleware()
const port = process.env.PORT || 3000

io.attach(server)
const isWorker = sticky.listen(server, port)

if (isWorker) {
  /**
   * socket.io
   */
  io.on('connection', socket => {
    console.log('socket.io connected')

    socket.on('disconnect', () => {})

    socket.on('operation_sighting_sent', data => {
      socket.broadcast.emit('reload_operation_sighting', { data: data })
    })
  })
}
/*
server.listen(port, () => {
  console.log(`Worker ${process.pid} started`)
  console.log('Server listening on port ' + port)
})
*/
// export default app

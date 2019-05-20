import http from 'http'
import sticky from 'sticky-session'
import socketMiddleware from 'socket.io'
import * as express from 'express'
import * as cookieParser from 'cookie-parser'
import bodyParser from 'body-parser'
import * as cors from 'cors'
import indexRouter from './routes/index'
import axios from 'axios'

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

app.use(async (req, res, next) => {
  // token取得する
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

  const token = req.header('Authorization').split(' ')

  try {
    const params = new URLSearchParams()
    params.append('token', token[1])
    const introspection = await axios.post(
      process.env.NODE_ENV === 'production'
        ? 'https://auth.sotetsu-lab.com/token/introspection'
        : 'http://sotetsu-lab-v3-auth:3000/token/introspection',
      params,
      {
        headers: {
          Authorization:
            'Basic ' +
            Buffer.from(
              req.header('X-APP-CLIENT-ID') +
                ':' +
                req.header('X-APP-CLIENT-SECRET')
            ).toString('base64')
        }
      }
    )

    if (!introspection.data.active) {
      next({
        status: 401,
        error: {
          type: 'Invalid Request',
          message: 'Token has expired.'
        }
      })
    }

    next()
  } catch (err) {
    console.log('エラー', err)
    next({
      status: 500,
      error: {
        type: 'Internal Server Error',
        message: 'Please tell administrator'
      }
    })
  }
})

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

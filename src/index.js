import * as express from 'express'
import * as cookieParser from 'cookie-parser'
import * as cors from 'cors'
import indexRouter from './routes/index'
import axios from 'axios'

const app = express()
const port = process.env.PORT || 3000

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(cors())
/*
app.use(async (req, res, next) => {
  console.log('Intercept Token', req.header('Authorization'))
  // token取得

  if (!req.header('Authorization')) {
    next({
      status: 401,
      error: {
        type: 'Invalid Request',
        message: 'Please set Authorization header.'
      }
    })
  }

  const token = req.header('Authorization').split(' ')
  console.log(token[1])

  try {
    const params = new URLSearchParams()
    params.append('token', token[1])
    const introspection = await axios.post(
      'https://auth.sotetsu-lab.com/token/introspection',
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

    console.log('チェッカー', introspection)

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
    next({
      status: 500,
      error: {
        type: 'Internal Server Error',
        message: 'Please tell administrator'
      }
    })
  }
})
*/

app.use('/', indexRouter)

app.use((err, req, res, next) => {
  console.log(err)
  console.error(err.stack)
  res.status(err.status).json(err)
})

app.listen(port, () => {
  console.log('Server listening on port ' + port)
})

export default app

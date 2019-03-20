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

app.use(async (req, res, next) => {
  console.log('Interceot')
  // token取得
  try {
    const params = new URLSearchParams()
    params.append('grant_type', 'client_credentials')
    const token = await axios.post('http://localhost:3030/token', params, {
      headers: {
        Authorization: 'Basic ' + Buffer.from(`0:0`).toString('base64')
      }
    })
    console.log(token.data.access_token)

    const params2 = new URLSearchParams()
    params2.append('token', '')
    const introspection = await axios.post(
      'http://localhost:3030/token/introspection',
      params2,
      {
        headers: {
          Authorization: 'Basic ' + Buffer.from(`0:0`).toString('base64')
        }
      }
    )

    console.log(introspection)

    if (!introspection.data.active) {
      throw {
        response: {
          data: {
            error: 'invalid_request',
            error_description: 'token has expired'
          }
        }
      }
    }

    next()
  } catch (err) {
    console.log(err, 'エラー')
    res.json(err.response.data)
  }
})

app.use('/', indexRouter)

app.listen(port, () => {
  console.log('Server listening on port ' + port)
})

export default app

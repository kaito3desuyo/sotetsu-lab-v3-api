import * as express from 'express'
import * as cookieParser from 'cookie-parser'
import * as cors from 'cors'
import indexRouter from './routes/index'
const app = express()
const port = process.env.PORT || 3000

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(cors())

app.use('/', indexRouter)

app.listen(port, () => {
  console.log('Server listening on port ' + port)
})

export default app

import express from 'express'
import cors from 'cors'
import { requestId } from './middleware/request-id'
import { apiRateLimit } from './middleware/rate-limit'
import { errorHandler } from './middleware/error-handler'

import authRouter from './modules/auth/auth.router'
import timecardRouter from './modules/timecards/timecard.router'
import overtimeRouter from './modules/overtime/overtime.router'
import leaveRouter from './modules/leaves/leave.router'
import approvalRouter from './modules/approvals/approval.router'
import userRouter from './modules/users/user.router'
import configRouter from './modules/config/config.router'
import calendarRouter from './modules/calendar/calendar.router'
import dashboardRouter from './modules/dashboard/dashboard.router'
import productRouter from './modules/products/product.router'
import inventoryRouter from './modules/inventory/inventory.router'
import quotationRouter from './modules/quotations/quotation.router'
import cronRouter from './modules/cron/cron.router'

const app = express()

app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.use(requestId)
app.use(apiRateLimit)

app.use('/api/v1/auth', authRouter)
app.use('/api/v1/timecards', timecardRouter)
app.use('/api/v1/overtime', overtimeRouter)
app.use('/api/v1/leaves', leaveRouter)
app.use('/api/v1/approvals', approvalRouter)
app.use('/api/v1/users', userRouter)
app.use('/api/v1/config', configRouter)
app.use('/api/v1/calendar', calendarRouter)
app.use('/api/v1/dashboard', dashboardRouter)
app.use('/api/v1/products', productRouter)
app.use('/api/v1/inventory', inventoryRouter)
app.use('/api/v1/quotations', quotationRouter)
app.use('/api/v1/cron', cronRouter)

app.use(errorHandler)

export default app

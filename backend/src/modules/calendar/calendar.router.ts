import { Router } from 'express'
import { calendarController } from './calendar.controller'
import { authenticate } from '../../middleware/authenticate'
import { forcePasswordChange } from '../../middleware/force-password-change'

const router = Router()

router.use(authenticate, forcePasswordChange)
router.get('/', calendarController.get)

export default router

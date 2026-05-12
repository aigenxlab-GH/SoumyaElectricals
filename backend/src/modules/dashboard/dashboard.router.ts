import { Router } from 'express'
import { dashboardController } from './dashboard.controller'
import { authenticate } from '../../middleware/authenticate'
import { forcePasswordChange } from '../../middleware/force-password-change'

const router = Router()

router.use(authenticate, forcePasswordChange)
router.get('/', dashboardController.get)

export default router

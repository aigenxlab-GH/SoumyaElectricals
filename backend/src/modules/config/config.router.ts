import { Router } from 'express'
import { configController } from './config.controller'
import { authenticate } from '../../middleware/authenticate'
import { roleGuard } from '../../middleware/role-guard'
import { forcePasswordChange } from '../../middleware/force-password-change'
import { validate } from '../../middleware/validate'
import { SystemConfigSchema } from './config.schema'

const router = Router()

router.get('/', authenticate, configController.get)
router.put('/', authenticate, forcePasswordChange, roleGuard('owner'), validate(SystemConfigSchema), configController.save)

export default router

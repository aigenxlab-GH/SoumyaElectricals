import { Router } from 'express'
import { overtimeController } from './overtime.controller'
import { authenticate } from '../../middleware/authenticate'
import { forcePasswordChange } from '../../middleware/force-password-change'
import { validate } from '../../middleware/validate'
import { CreateOvertimeSchema, UpdateOvertimeSchema } from './overtime.schema'

const router = Router()

router.use(authenticate, forcePasswordChange)

router.get('/', overtimeController.list)
router.post('/', validate(CreateOvertimeSchema), overtimeController.create)
router.patch('/:id', validate(UpdateOvertimeSchema), overtimeController.update)
router.delete('/:id', overtimeController.delete)

export default router

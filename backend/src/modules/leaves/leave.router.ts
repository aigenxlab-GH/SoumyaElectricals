import { Router } from 'express'
import { leaveController } from './leave.controller'
import { authenticate } from '../../middleware/authenticate'
import { forcePasswordChange } from '../../middleware/force-password-change'
import { validate } from '../../middleware/validate'
import { ApplyLeaveSchema, BulkLeaveSchema, UpdateLeaveSchema } from './leave.schema'

const router = Router()

router.use(authenticate, forcePasswordChange)

router.get('/', leaveController.list)
router.get('/balance', leaveController.getBalance)
router.post('/', validate(ApplyLeaveSchema), leaveController.applySingle)
router.post('/bulk', validate(BulkLeaveSchema), leaveController.applyBulk)
router.patch('/:id', validate(UpdateLeaveSchema), leaveController.update)
router.delete('/:id', leaveController.delete)

export default router

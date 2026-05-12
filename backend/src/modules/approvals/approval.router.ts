import { Router } from 'express'
import { approvalController } from './approval.controller'
import { authenticate } from '../../middleware/authenticate'
import { roleGuard } from '../../middleware/role-guard'
import { forcePasswordChange } from '../../middleware/force-password-change'
import { validate } from '../../middleware/validate'
import { ApprovalActionSchema } from './approval.schema'

const router = Router()

router.use(authenticate, forcePasswordChange, roleGuard('manager', 'owner'))

router.get('/timecards', approvalController.listTimecards)
router.get('/leaves', approvalController.listLeaves)
router.get('/overtimes', approvalController.listOvertimes)
router.post('/timecards/:id', validate(ApprovalActionSchema), approvalController.processTimecard)
router.post('/leaves/:id', validate(ApprovalActionSchema), approvalController.processLeave)
router.post('/overtimes/:id', validate(ApprovalActionSchema), approvalController.processOvertime)

export default router

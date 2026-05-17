import { Router } from 'express'
import { salaryController } from './salary.controller'
import { authenticate } from '../../middleware/authenticate'
import { roleGuard } from '../../middleware/role-guard'
import { forcePasswordChange } from '../../middleware/force-password-change'
import { validate } from '../../middleware/validate'
import { SetSalarySchema } from '@soumya/shared'

const router = Router()

router.use(authenticate, forcePasswordChange)

// All salary endpoints are owner-only — they expose compensation data.
router.get('/:userId/history', roleGuard('owner'), salaryController.listForUser)
router.get('/:userId/current', roleGuard('owner'), salaryController.currentForUser)
router.post('/:userId', roleGuard('owner'), validate(SetSalarySchema), salaryController.set)

export default router

import { Router } from 'express'
import { payrollController } from './payroll.controller'
import { authenticate } from '../../middleware/authenticate'
import { roleGuard } from '../../middleware/role-guard'
import { forcePasswordChange } from '../../middleware/force-password-change'
import { validate } from '../../middleware/validate'
import { GeneratePayrollSchema, ProcessPayrollSchema } from '@soumya/shared'

const router = Router()

router.use(authenticate, forcePasswordChange)

// Payroll is owner + manager only — employee blocked at service layer too.
const ownerOrManager = roleGuard('owner', 'manager')

router.get('/',           ownerOrManager, payrollController.list)
router.get('/:id',        ownerOrManager, payrollController.getById)
router.post('/generate',  ownerOrManager, validate(GeneratePayrollSchema), payrollController.generate)
router.post('/:id/process', ownerOrManager, validate(ProcessPayrollSchema), payrollController.process)
router.delete('/:id',     ownerOrManager, payrollController.remove)

export default router

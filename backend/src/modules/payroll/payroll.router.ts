import { Router } from 'express'
import { payrollController } from './payroll.controller'
import { authenticate } from '../../middleware/authenticate'
import { roleGuard } from '../../middleware/role-guard'
import { forcePasswordChange } from '../../middleware/force-password-change'
import { validate } from '../../middleware/validate'
import { GeneratePayrollSchema, ProcessPayrollSchema } from '@soumya/shared'

const router = Router()

router.use(authenticate, forcePasswordChange)

// Write endpoints — owner + manager only (service also blocks employees defensively)
const writers = roleGuard('owner', 'manager')

// Read endpoints — open to all authenticated roles; service enforces own-data for employees
router.get('/',           writers, payrollController.list)           // roster (writers only)
router.get('/lookup',              payrollController.lookup)          // any role; service does own-id check
router.get('/history',             payrollController.history)         // any role; service does own-id check
router.get('/:id',                 payrollController.getById)         // any role; service does own-id check

router.post('/generate',        writers, validate(GeneratePayrollSchema), payrollController.generate)
router.post('/bulk-generate',   writers, payrollController.bulkGenerate)
router.post('/:id/process',     writers, validate(ProcessPayrollSchema), payrollController.process)
router.delete('/:id',           writers, payrollController.remove)

export default router

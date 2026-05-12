import { Router } from 'express'
import { quotationController } from './quotation.controller'
import { authenticate } from '../../middleware/authenticate'
import { roleGuard } from '../../middleware/role-guard'
import { forcePasswordChange } from '../../middleware/force-password-change'
import { validate } from '../../middleware/validate'
import { CreateQuotationSchema, UpdateQuotationSchema, ProcessQuotationSchema } from '@soumya/shared'

const router = Router()

const auth = [authenticate, forcePasswordChange]
const approverOnly = [authenticate, forcePasswordChange, roleGuard('manager', 'owner')]

// List & detail — all roles
router.get('/', ...auth, quotationController.list)
router.get('/pending', ...approverOnly, quotationController.pendingList)
router.get('/:id', ...auth, quotationController.getById)

// Create & edit — all roles
router.post('/', ...auth, validate(CreateQuotationSchema), quotationController.create)
router.patch('/:id', ...auth, validate(UpdateQuotationSchema), quotationController.update)

// Delete — rejected/cancelled only (service enforces status + ownership)
router.delete('/:id', ...auth, quotationController.deleteQuotation)

// Status transitions — all roles (service enforces ownership/role)
router.post('/:id/submit', ...auth, quotationController.submit)
router.post('/:id/self-approve', ...auth, quotationController.selfApprove)
router.post('/:id/self-reject', ...auth, quotationController.selfReject)
router.post('/:id/finalise', ...auth, quotationController.finalise)
router.post('/:id/cancel', ...auth, quotationController.cancel)

// Approve / reject — manager + owner only
router.post('/:id/process', ...approverOnly, validate(ProcessQuotationSchema), quotationController.processApproval)

export default router

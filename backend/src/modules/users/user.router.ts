import { Router } from 'express'
import { userController } from './user.controller'
import { authenticate } from '../../middleware/authenticate'
import { roleGuard } from '../../middleware/role-guard'
import { forcePasswordChange } from '../../middleware/force-password-change'
import { validate } from '../../middleware/validate'
import { CreateUserSchema, UpdateUserSchema } from './user.schema'

const router = Router()

router.use(authenticate, forcePasswordChange)

router.get('/', roleGuard('owner'), userController.list)
router.get('/reportable', roleGuard('manager', 'owner'), userController.listReportable)
router.get('/my-manager', userController.getMyManager)
router.get('/:id', roleGuard('owner'), userController.getById)
router.post('/', roleGuard('owner'), validate(CreateUserSchema), userController.create)
router.patch('/:id', roleGuard('owner'), validate(UpdateUserSchema), userController.update)
router.post('/:id/reset-password', roleGuard('owner'), userController.resetPassword)
router.delete('/:id', roleGuard('owner'), userController.deleteUser)

export default router

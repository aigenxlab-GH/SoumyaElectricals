import { Router } from 'express'
import { authController } from './auth.controller'
import { authenticate } from '../../middleware/authenticate'
import { validate } from '../../middleware/validate'
import { loginRateLimit, changePasswordRateLimit } from '../../middleware/rate-limit'
import { LoginSchema, ChangePasswordSchema } from './auth.schema'

const router = Router()

router.post('/login', loginRateLimit, validate(LoginSchema), authController.login)
router.post('/change-password', changePasswordRateLimit, authenticate, validate(ChangePasswordSchema), authController.changePassword)

export default router

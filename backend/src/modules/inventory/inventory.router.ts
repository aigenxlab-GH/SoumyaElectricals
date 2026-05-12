import { Router } from 'express'
import { inventoryController } from './inventory.controller'
import { authenticate } from '../../middleware/authenticate'
import { roleGuard } from '../../middleware/role-guard'
import { forcePasswordChange } from '../../middleware/force-password-change'
import { validate } from '../../middleware/validate'
import { SaveForecastSchema } from '@soumya/shared'

const router = Router()

// All roles can view inventory
router.get('/', authenticate, forcePasswordChange, inventoryController.list)

// Owner and Manager only can save forecasts
router.post(
  '/forecast',
  authenticate,
  forcePasswordChange,
  roleGuard('owner', 'manager'),
  validate(SaveForecastSchema),
  inventoryController.saveForecast
)

export default router

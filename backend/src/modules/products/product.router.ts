import { Router } from 'express'
import { productController } from './product.controller'
import { authenticate } from '../../middleware/authenticate'
import { roleGuard } from '../../middleware/role-guard'
import { forcePasswordChange } from '../../middleware/force-password-change'
import { validate } from '../../middleware/validate'
import { CreateProductSchema, UpdateProductSchema, ToggleProductStatusSchema } from '@soumya/shared'

const router = Router()

// All roles — active products list (for quotation product selector)
router.get('/active', authenticate, forcePasswordChange, productController.listActive)

// All roles — single product (used when viewing quotation)
router.get('/:id', authenticate, forcePasswordChange, productController.getById)

// Owner only
router.get('/', authenticate, forcePasswordChange, roleGuard('owner'), productController.list)
router.post('/', authenticate, forcePasswordChange, roleGuard('owner'), validate(CreateProductSchema), productController.create)
router.patch('/:id', authenticate, forcePasswordChange, roleGuard('owner'), validate(UpdateProductSchema), productController.update)
router.patch('/:id/status', authenticate, forcePasswordChange, roleGuard('owner'), validate(ToggleProductStatusSchema), productController.toggleStatus)

export default router

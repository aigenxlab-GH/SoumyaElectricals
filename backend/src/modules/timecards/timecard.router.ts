import { Router } from 'express'
import { timecardController } from './timecard.controller'
import { authenticate } from '../../middleware/authenticate'
import { forcePasswordChange } from '../../middleware/force-password-change'
import { validate } from '../../middleware/validate'
import { CreateTimecardSchema, BulkTimecardSchema, UpdateTimecardSchema } from './timecard.schema'

const router = Router()

router.use(authenticate, forcePasswordChange)

router.get('/', timecardController.list)
router.post('/', validate(CreateTimecardSchema), timecardController.createSingle)
router.post('/bulk', validate(BulkTimecardSchema), timecardController.createBulk)
router.patch('/:id', validate(UpdateTimecardSchema), timecardController.update)
router.delete('/:id', timecardController.delete)

export default router

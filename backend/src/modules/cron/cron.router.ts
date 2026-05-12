import { Router, type Request, type Response, type NextFunction } from 'express'
import { supabase } from '../../lib/supabase'
import { config } from '../../config'
import { AppError } from '../../types'
import { ok } from '../../utils/response'

const router = Router()

/** Simple secret-header guard — no JWT needed for cron callers */
function cronAuth(req: Request, _res: Response, next: NextFunction) {
  if (req.headers['x-cron-secret'] !== config.X_CRON_SECRET) {
    return next(new AppError('UNAUTHORIZED', 'Invalid cron secret', 401))
  }
  next()
}

/**
 * POST /api/v1/cron/purge-quotations
 * Deletes rejected/cancelled quotations whose updated_at is older than 10 days.
 * quotation_items cascade-delete automatically (ON DELETE CASCADE, V16).
 * Inventory was already released at rejection/cancellation time — no adjustment needed.
 */
router.post('/purge-quotations', cronAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const cutoff = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()

    const { count, error } = await supabase
      .from('quotations')
      .delete({ count: 'exact' })
      .in('status', ['rejected', 'cancelled'])
      .lt('updated_at', cutoff)

    if (error) throw new AppError('DB_ERROR', error.message, 500)

    res.json(ok({ deleted: count ?? 0, cutoff }))
  } catch (err) {
    next(err)
  }
})

export default router

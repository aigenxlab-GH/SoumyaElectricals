import type { Request, Response, NextFunction } from 'express'
import { dashboardService } from './dashboard.service'
import { ok } from '../../utils/response'

export const dashboardController = {
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(ok(await dashboardService.get(req.user)))
    } catch (err) { next(err) }
  },
}

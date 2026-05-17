import type { Request, Response, NextFunction } from 'express'
import { salaryService } from './salary.service'
import { ok } from '../../utils/response'

export const salaryController = {
  async listForUser(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(ok(await salaryService.list(req.params.userId)))
    } catch (err) { next(err) }
  },

  async currentForUser(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(ok({ monthly_salary: await salaryService.current(req.params.userId) }))
    } catch (err) { next(err) }
  },

  async set(req: Request, res: Response, next: NextFunction) {
    try {
      const entry = await salaryService.set(req.params.userId, req.body, req.user!)
      res.status(201).json(ok(entry))
    } catch (err) { next(err) }
  },
}

import type { Request, Response, NextFunction } from 'express'
import { timecardService } from './timecard.service'
import { ok } from '../../utils/response'

export const timecardController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { year, month } = req.query
      const data = await timecardService.list(req.user.id, Number(year), Number(month))
      res.json(ok(data))
    } catch (err) { next(err) }
  },

  async createSingle(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await timecardService.createSingle(req.user, req.body)
      res.status(201).json(ok(data))
    } catch (err) { next(err) }
  },

  async createBulk(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await timecardService.createBulk(req.user, req.body)
      res.status(201).json(ok(data))
    } catch (err) { next(err) }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await timecardService.update(req.user, req.params.id, req.body)
      res.json(ok(data))
    } catch (err) { next(err) }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await timecardService.delete(req.user, req.params.id)
      res.status(204).send()
    } catch (err) { next(err) }
  },
}

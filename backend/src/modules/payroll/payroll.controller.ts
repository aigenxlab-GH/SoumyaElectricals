import type { Request, Response, NextFunction } from 'express'
import { payrollService } from './payroll.service'
import { ok } from '../../utils/response'

export const payrollController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const year  = Number(req.query.year)
      const month = Number(req.query.month)
      if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'year and month are required query params' } })
      }
      res.json(ok(await payrollService.list(req.user!, year, month)))
    } catch (err) { next(err) }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(ok(await payrollService.detail(req.user!, req.params.id)))
    } catch (err) { next(err) }
  },

  async generate(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(ok(await payrollService.generate(req.user!, req.body)))
    } catch (err) { next(err) }
  },

  async process(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(ok(await payrollService.process(req.user!, req.params.id, req.body)))
    } catch (err) { next(err) }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await payrollService.remove(req.user!, req.params.id)
      res.status(204).send()
    } catch (err) { next(err) }
  },
}

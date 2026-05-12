import type { Request, Response, NextFunction } from 'express'
import { leaveService } from './leave.service'
import { ok } from '../../utils/response'

export const leaveController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { year, month } = req.query
      res.json(ok(await leaveService.list(req.user.id, Number(year), Number(month))))
    } catch (err) { next(err) }
  },

  async getBalance(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(ok(await leaveService.getBalance(req.user.id)))
    } catch (err) { next(err) }
  },

  async applySingle(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json(ok(await leaveService.applySingle(req.user, req.body)))
    } catch (err) { next(err) }
  },

  async applyBulk(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json(ok(await leaveService.applyBulk(req.user, req.body)))
    } catch (err) { next(err) }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(ok(await leaveService.update(req.user, req.params.id, req.body)))
    } catch (err) { next(err) }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await leaveService.delete(req.user, req.params.id)
      res.status(204).send()
    } catch (err) { next(err) }
  },
}

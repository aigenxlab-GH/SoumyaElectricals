import type { Request, Response, NextFunction } from 'express'
import { overtimeService } from './overtime.service'
import { ok } from '../../utils/response'

export const overtimeController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { year, month } = req.query
      res.json(ok(await overtimeService.list(req.user.id, Number(year), Number(month))))
    } catch (err) { next(err) }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json(ok(await overtimeService.create(req.user, req.body)))
    } catch (err) { next(err) }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(ok(await overtimeService.update(req.user, req.params.id, req.body)))
    } catch (err) { next(err) }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await overtimeService.delete(req.user, req.params.id)
      res.status(204).send()
    } catch (err) { next(err) }
  },
}

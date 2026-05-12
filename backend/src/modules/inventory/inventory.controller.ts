import type { Request, Response, NextFunction } from 'express'
import { inventoryService } from './inventory.service'
import { ok } from '../../utils/response'

export const inventoryController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(ok(await inventoryService.list()))
    } catch (err) { next(err) }
  },

  async saveForecast(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await inventoryService.saveForecast(req.body, req.user!.id)
      res.json(ok(result))
    } catch (err) { next(err) }
  },
}

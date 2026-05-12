import type { Request, Response, NextFunction } from 'express'
import { configService } from './config.service'
import { ok } from '../../utils/response'

export const configController = {
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(ok(await configService.get()))
    } catch (err) { next(err) }
  },

  async save(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await configService.save(req.body)
      res.json(ok({ message: 'Configuration saved', cancelledLeaves: result.cancelledLeaves }))
    } catch (err) { next(err) }
  },
}

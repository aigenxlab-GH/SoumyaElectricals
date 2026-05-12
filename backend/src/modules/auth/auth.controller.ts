import type { Request, Response, NextFunction } from 'express'
import { authService } from './auth.service'
import { ok } from '../../utils/response'

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(req.body)
      res.status(200).json(ok(result))
    } catch (err) {
      next(err)
    }
  },

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.changePassword(req.user.id, req.user.employee_id, req.body)
      res.status(200).json(ok({ message: 'Password changed successfully' }))
    } catch (err) {
      next(err)
    }
  },
}

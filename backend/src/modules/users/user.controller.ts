import type { Request, Response, NextFunction } from 'express'
import { userService } from './user.service'
import { ok } from '../../utils/response'

export const userController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(ok(await userService.list()))
    } catch (err) { next(err) }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user.role === 'owner'
        ? await userService.getByIdWithAadhaar(req.params.id)
        : await userService.getById(req.params.id)
      res.json(ok(user))
    } catch (err) { next(err) }
  },

  async listReportable(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(ok(await userService.listReportable(req.user.id)))
    } catch (err) { next(err) }
  },

  // Returns the current user's manager basic info (available to any role)
  async getMyManager(req: Request, res: Response, next: NextFunction) {
    try {
      const managerId = req.user.manager_id
      if (!managerId) return res.json(ok(null))
      res.json(ok(await userService.getById(managerId)))
    } catch (err) { next(err) }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json(ok(await userService.create(req.body, req.user.id)))
    } catch (err) { next(err) }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(ok(await userService.update(req.params.id, req.body)))
    } catch (err) { next(err) }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(ok(await userService.resetPassword(req.params.id, req.user!.id)))
    } catch (err) { next(err) }
  },
}

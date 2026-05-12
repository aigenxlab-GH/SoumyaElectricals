import type { Request, Response, NextFunction } from 'express'
import { approvalService } from './approval.service'
import { ok } from '../../utils/response'

export const approvalController = {
  async listTimecards(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(ok(await approvalService.listTimecards(req.user)))
    } catch (err) { next(err) }
  },

  async listLeaves(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(ok(await approvalService.listLeaves(req.user)))
    } catch (err) { next(err) }
  },

  async listOvertimes(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(ok(await approvalService.listOvertimes(req.user)))
    } catch (err) { next(err) }
  },

  async processTimecard(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(ok(await approvalService.processTimecard(req.params.id, req.body.action)))
    } catch (err) { next(err) }
  },

  async processLeave(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(ok(await approvalService.processLeave(req.params.id, req.body.action)))
    } catch (err) { next(err) }
  },

  async processOvertime(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(ok(await approvalService.processOvertime(req.params.id, req.body.action)))
    } catch (err) { next(err) }
  },
}

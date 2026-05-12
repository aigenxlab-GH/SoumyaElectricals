import type { Request, Response, NextFunction } from 'express'
import { quotationService } from './quotation.service'
import { ok } from '../../utils/response'
import type { QuotationListParams, QuotationStatus } from '@soumya/shared'

export const quotationController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      // status can arrive as a single string, repeated string (?status=a&status=b → array), or comma-separated
      const rawStatus = req.query.status
      let status: QuotationStatus | QuotationStatus[] | undefined
      if (Array.isArray(rawStatus)) {
        status = rawStatus as QuotationStatus[]
      } else if (typeof rawStatus === 'string' && rawStatus.length > 0) {
        status = rawStatus.includes(',')
          ? rawStatus.split(',').filter(Boolean) as QuotationStatus[]
          : rawStatus as QuotationStatus
      }

      const params: QuotationListParams = {
        status,
        createdBy: req.query.createdBy as string | undefined,
        search:    req.query.search    as string | undefined,
        dateFrom:  req.query.dateFrom  as string | undefined,
        dateTo:    req.query.dateTo    as string | undefined,
        limit:     req.query.limit  ? Number(req.query.limit)  : 25,
        offset:    req.query.offset ? Number(req.query.offset) : 0,
      }
      res.json(ok(await quotationService.list(req.user!, params)))
    } catch (err) { next(err) }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(ok(await quotationService.getById(req.params.id, req.user!)))
    } catch (err) { next(err) }
  },

  async pendingList(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(ok(await quotationService.pendingList(req.user!)))
    } catch (err) { next(err) }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await quotationService.create(req.body, req.user!)
      res.status(201).json(ok(result))
    } catch (err) { next(err) }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(ok(await quotationService.update(req.params.id, req.body, req.user!)))
    } catch (err) { next(err) }
  },

  async submit(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(ok(await quotationService.submit(req.params.id, req.user!)))
    } catch (err) { next(err) }
  },

  async selfApprove(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(ok(await quotationService.selfApprove(req.params.id, req.user!)))
    } catch (err) { next(err) }
  },

  async selfReject(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(ok(await quotationService.selfReject(req.params.id, req.user!)))
    } catch (err) { next(err) }
  },

  async finalise(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(ok(await quotationService.finalise(req.params.id, req.user!)))
    } catch (err) { next(err) }
  },

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(ok(await quotationService.cancel(req.params.id, req.user!)))
    } catch (err) { next(err) }
  },

  async processApproval(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(ok(await quotationService.approve(req.params.id, req.body, req.user!)))
    } catch (err) { next(err) }
  },

  async deleteQuotation(req: Request, res: Response, next: NextFunction) {
    try {
      await quotationService.delete(req.params.id, req.user!)
      res.status(204).send()
    } catch (err) { next(err) }
  },
}

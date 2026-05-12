import type { Request, Response, NextFunction } from 'express'
import { productService } from './product.service'
import { ok } from '../../utils/response'

export const productController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(ok(await productService.list()))
    } catch (err) { next(err) }
  },

  async listActive(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(ok(await productService.listActive()))
    } catch (err) { next(err) }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(ok(await productService.getById(req.params.id)))
    } catch (err) { next(err) }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.create(req.body, req.user!.id)
      res.status(201).json(ok(product))
    } catch (err) { next(err) }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(ok(await productService.update(req.params.id, req.body)))
    } catch (err) { next(err) }
  },

  async toggleStatus(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(ok(await productService.toggleStatus(req.params.id, req.body.status)))
    } catch (err) { next(err) }
  },
}

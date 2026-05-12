import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../types'
import { logger } from '../lib/logger'
import { fail } from '../utils/response'

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(fail(err.code, err.message, err.details))
  }

  logger.error({ err, requestId: req.requestId }, 'Unhandled error')
  res.status(500).json(fail('INTERNAL_ERROR', 'An unexpected error occurred'))
}

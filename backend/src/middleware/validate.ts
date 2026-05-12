import type { Request, Response, NextFunction } from 'express'
import type { ZodSchema } from 'zod'
import { fail } from '../utils/response'

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      return res.status(422).json(
        fail('VALIDATION_ERROR', 'Invalid request body', result.error.flatten().fieldErrors)
      )
    }
    req.body = result.data
    next()
  }
}

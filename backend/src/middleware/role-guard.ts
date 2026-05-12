import type { Request, Response, NextFunction } from 'express'
import type { Role } from '@soumya/shared'
import { fail } from '../utils/response'

export function roleGuard(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json(fail('FORBIDDEN', 'You do not have permission to perform this action'))
    }
    next()
  }
}

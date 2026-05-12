import type { Request, Response, NextFunction } from 'express'
import { fail } from '../utils/response'

export function forcePasswordChange(req: Request, res: Response, next: NextFunction) {
  if (req.user?.is_default_password && !req.path.endsWith('/auth/change-password')) {
    return res.status(403).json(
      fail('FORCE_PASSWORD_CHANGE', 'Please change your default password before continuing.')
    )
  }
  next()
}

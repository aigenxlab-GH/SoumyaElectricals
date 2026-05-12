import type { Request, Response, NextFunction } from 'express'
import { calendarService } from './calendar.service'
import { ok } from '../../utils/response'

export const calendarController = {
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const { user_id, year, month } = req.query
      const data = await calendarService.getCalendar(
        req.user,
        user_id as string | undefined,
        Number(year),
        Number(month)
      )
      res.json(ok(data))
    } catch (err) { next(err) }
  },
}

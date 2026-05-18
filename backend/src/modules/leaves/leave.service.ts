import { AppError } from '../../types'
import { expandDateRange, isSunday } from '../../utils/date-utils'
import { configRepository } from '../config/config.repository'
import { leaveRepository } from './leave.repository'
import { timecardRepository } from '../timecards/timecard.repository'
import type { AuthUser } from '../../types'
import type { ApplyLeaveDto, BulkLeaveDto, UpdateLeaveDto } from './leave.schema'

export const leaveService = {
  async list(userId: string, year: number, month: number) {
    return leaveRepository.listByMonth(userId, year, month)
  },

  async getBalance(userId: string) {
    return leaveRepository.getBalance(userId)
  },

  async applySingle(user: AuthUser, dto: ApplyLeaveDto) {
    // Single apply: explicitly block Sunday and holidays with a clear error
    if (isSunday(dto.date)) {
      throw new AppError('INVALID_DATE', 'Sunday is a weekly off — leave cannot be applied on Sundays.', 400)
    }
    const allHolidays = await configRepository.getHolidays()
    const holidayMatch = allHolidays.find((h) => h.date === dto.date)
    if (holidayMatch) {
      throw new AppError(
        'INVALID_DATE',
        `"${holidayMatch.name}" is a public holiday — leave cannot be applied on a holiday.`,
        400
      )
    }

    const existing = await leaveRepository.findExistingDates(user.id, [dto.date])
    if (existing.length > 0) {
      throw new AppError('DUPLICATE', 'You already have a leave applied for this date.', 409)
    }

    // Cross-validate: cannot apply leave on a date with an applied/approved timecard
    const timecardDates = await timecardRepository.findExistingDates(user.id, [dto.date])
    if (timecardDates.length > 0) {
      throw new AppError('TIMECARD_EXISTS', 'You already have a timecard (applied or approved) on this date. Delete the timecard first to apply leave.', 400)
    }

    const created = await leaveRepository.insertMany(user.id, [dto.date], dto.reason)
    await leaveRepository.deductBalance(user.id, 1)
    return created[0]
  },

  async applyBulk(user: AuthUser, dto: BulkLeaveDto) {
    const allHolidays = await configRepository.getHolidays()
    const holidayDates = allHolidays.map((h) => h.date)
    const dates = expandDateRange(dto.start_date, dto.end_date, holidayDates)

    const existingLeaves    = await leaveRepository.findExistingDates(user.id, dates)
    const existingTimecards = await timecardRepository.findExistingDates(user.id, dates)
    const blocked = new Set([...existingLeaves, ...existingTimecards])
    const newDates = dates.filter((d) => !blocked.has(d))
    const skipped = dates.length - newDates.length

    if (newDates.length === 0) {
      return { created: [], skipped, conflictingTimecards: existingTimecards.length }
    }

    const created = await leaveRepository.insertMany(user.id, newDates, dto.reason)
    await leaveRepository.deductBalance(user.id, newDates.length)

    return { created, skipped, conflictingTimecards: existingTimecards.length }
  },

  async update(user: AuthUser, id: string, dto: UpdateLeaveDto) {
    const existing = await leaveRepository.findById(id)
    if (!existing || existing.user_id !== user.id) {
      throw new AppError('NOT_FOUND', 'Leave not found', 404)
    }
    if (existing.status !== 'applied') {
      throw new AppError('UNEDITABLE', 'Cannot edit an approved leave', 400)
    }
    return leaveRepository.update(id, dto.reason)
  },

  async delete(user: AuthUser, id: string) {
    const existing = await leaveRepository.findById(id)
    if (!existing || existing.user_id !== user.id) {
      throw new AppError('NOT_FOUND', 'Leave not found', 404)
    }
    if (existing.status !== 'applied') {
      throw new AppError('UNEDITABLE', 'Cannot delete an approved leave', 400)
    }
    await leaveRepository.delete(id)
    await leaveRepository.restoreBalance(user.id, 1)
  },
}

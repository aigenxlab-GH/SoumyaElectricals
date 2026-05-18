import { AppError } from '../../types'
import { expandDateRange } from '../../utils/date-utils'
import { configRepository } from '../config/config.repository'
import { timecardRepository } from './timecard.repository'
import { leaveRepository } from '../leaves/leave.repository'
import type { AuthUser } from '../../types'
import type { CreateTimecardDto, BulkTimecardDto, UpdateTimecardDto } from './timecard.schema'

export const timecardService = {
  async list(userId: string, year: number, month: number) {
    return timecardRepository.listByMonth(userId, year, month)
  },

  async createSingle(user: AuthUser, dto: CreateTimecardDto) {
    const holidays = await configRepository.getHolidayDates()
    const existing = await timecardRepository.findExistingDates(user.id, [dto.date])
    if (existing.length > 0) {
      throw new AppError('DUPLICATE', 'A timecard for this date already exists', 409)
    }
    if (new Date(dto.date).getDay() === 0) {
      throw new AppError('INVALID_DATE', 'Cannot log timecard on Sunday', 400)
    }
    if (holidays.includes(dto.date)) {
      throw new AppError('INVALID_DATE', 'Cannot log timecard on a holiday', 400)
    }
    // Cross-validate: cannot apply timecard on a date with an applied/approved leave
    const leaveDates = await leaveRepository.findExistingDates(user.id, [dto.date])
    if (leaveDates.length > 0) {
      throw new AppError('LEAVE_EXISTS', 'You already have a leave (applied or approved) on this date. Delete the leave first to log a timecard.', 400)
    }
    return timecardRepository.insertOne(user.id, dto.date, dto.work_log)
  },

  async createBulk(user: AuthUser, dto: BulkTimecardDto) {
    const holidays = await configRepository.getHolidayDates()
    const dates = expandDateRange(dto.start_date, dto.end_date, holidays)
    const existingTimecards = await timecardRepository.findExistingDates(user.id, dates)
    const existingLeaves    = await leaveRepository.findExistingDates(user.id, dates)
    const blocked = new Set([...existingTimecards, ...existingLeaves])
    const newDates = dates.filter((d) => !blocked.has(d))
    const skipped = dates.length - newDates.length

    const created = newDates.length > 0
      ? await timecardRepository.insertMany(user.id, newDates, dto.work_log)
      : []

    return { created, skipped, conflictingLeaves: existingLeaves.length }
  },

  async update(user: AuthUser, id: string, dto: UpdateTimecardDto) {
    const existing = await timecardRepository.findById(id)
    if (!existing || existing.user_id !== user.id) {
      throw new AppError('NOT_FOUND', 'Timecard not found', 404)
    }
    if (existing.status !== 'applied') {
      throw new AppError('UNEDITABLE', 'Cannot edit an approved timecard', 400)
    }
    return timecardRepository.update(id, dto.work_log)
  },

  async delete(user: AuthUser, id: string) {
    const existing = await timecardRepository.findById(id)
    if (!existing || existing.user_id !== user.id) {
      throw new AppError('NOT_FOUND', 'Timecard not found', 404)
    }
    if (existing.status !== 'applied') {
      throw new AppError('UNEDITABLE', 'Cannot delete an approved timecard', 400)
    }
    await timecardRepository.delete(id)
  },
}

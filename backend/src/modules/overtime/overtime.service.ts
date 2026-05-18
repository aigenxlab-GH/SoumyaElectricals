import { AppError } from '../../types'
import { configRepository } from '../config/config.repository'
import { overtimeRepository } from './overtime.repository'
import { leaveRepository } from '../leaves/leave.repository'
import type { AuthUser } from '../../types'
import type { CreateOvertimeDto, UpdateOvertimeDto } from './overtime.schema'

function isFutureDate(isoDate: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(isoDate + 'T00:00:00')
  return d.getTime() > today.getTime()
}

export const overtimeService = {
  async list(userId: string, year: number, month: number) {
    return overtimeRepository.listByMonth(userId, year, month)
  },

  async create(user: AuthUser, dto: CreateOvertimeDto) {
    const sysConfig = await configRepository.getSystemConfig()
    const rate = user.role === 'manager'
      ? sysConfig.manager_overtime_rate_per_hour
      : sysConfig.overtime_rate_per_hour
    const payout = dto.hours * rate

    if (new Date(dto.date).getDay() === 0) {
      throw new AppError('INVALID_DATE', 'Cannot log overtime on Sunday', 400)
    }
    if (isFutureDate(dto.date)) {
      throw new AppError('FUTURE_DATE', 'Overtime cannot be logged for a future date. Pick today or an earlier date.', 400)
    }

    const holidays = await configRepository.getHolidayDates()
    if (holidays.includes(dto.date)) {
      throw new AppError('INVALID_DATE', 'Cannot log overtime on a holiday', 400)
    }

    // Cross-validate: cannot log overtime on a date with an applied/approved leave
    const leaveDates = await leaveRepository.findExistingDates(user.id, [dto.date])
    if (leaveDates.length > 0) {
      throw new AppError('LEAVE_EXISTS', 'You already have a leave (applied or approved) on this date. Delete the leave first to log overtime.', 400)
    }

    return overtimeRepository.insert(user.id, dto.date, dto.hours, payout, dto.work_log)
  },

  async update(user: AuthUser, id: string, dto: UpdateOvertimeDto) {
    const existing = await overtimeRepository.findById(id)
    if (!existing || existing.user_id !== user.id) {
      throw new AppError('NOT_FOUND', 'Overtime record not found', 404)
    }
    if (existing.status !== 'applied') {
      throw new AppError('UNEDITABLE', 'Cannot edit an approved overtime record', 400)
    }

    const sysConfig = await configRepository.getSystemConfig()
    const hours = dto.hours ?? existing.hours
    const rate = user.role === 'manager'
      ? sysConfig.manager_overtime_rate_per_hour
      : sysConfig.overtime_rate_per_hour
    const payout = hours * rate
    const workLog = dto.work_log ?? existing.work_log

    return overtimeRepository.update(id, hours, payout, workLog)
  },

  async delete(user: AuthUser, id: string) {
    const existing = await overtimeRepository.findById(id)
    if (!existing || existing.user_id !== user.id) {
      throw new AppError('NOT_FOUND', 'Overtime record not found', 404)
    }
    if (existing.status !== 'applied') {
      throw new AppError('UNEDITABLE', 'Cannot delete an approved overtime record', 400)
    }
    await overtimeRepository.delete(id)
  },
}

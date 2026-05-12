import { AppError } from '../../types'
import { configRepository } from '../config/config.repository'
import { overtimeRepository } from './overtime.repository'
import type { AuthUser } from '../../types'
import type { CreateOvertimeDto, UpdateOvertimeDto } from './overtime.schema'

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

    const holidays = await configRepository.getHolidayDates()
    if (holidays.includes(dto.date)) {
      throw new AppError('INVALID_DATE', 'Cannot log overtime on a holiday', 400)
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

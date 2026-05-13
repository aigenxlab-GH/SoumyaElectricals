import { configRepository } from './config.repository'
import { AppError } from '../../types'
import type { SystemConfigDto } from './config.schema'

export const configService = {
  async get() {
    const [config, holidays] = await Promise.all([
      configRepository.getSystemConfig(),
      configRepository.getHolidays(),
    ])
    return { ...config, holidays }
  },

  async save(dto: SystemConfigDto) {
    // Business rule: annual_leave_days can only be changed in December
    // (next year's allowance is set during December for the upcoming year).
    const existing = await configRepository.getSystemConfig()
    const monthIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getMonth() + 1
    if (dto.annual_leave_days !== existing.annual_leave_days && monthIST !== 12) {
      throw new AppError(
        'ANNUAL_LEAVE_LOCKED',
        'Annual leave days can only be updated in December. Other settings can still be saved.',
        400
      )
    }

    await configRepository.saveConfig(
      {
        annual_leave_days: dto.annual_leave_days,
        overtime_rate_per_hour: dto.overtime_rate_per_hour,
        manager_overtime_rate_per_hour: dto.manager_overtime_rate_per_hour,
        gst_pct: dto.gst_pct,
        brand_name: dto.brand_name,
        company_name: dto.company_name,
        company_address: dto.company_address,
        gstin_no: dto.gstin_no,
        company_email: dto.company_email,
        company_phone: dto.company_phone,
        company_website: dto.company_website,
        authorized_signatory: dto.authorized_signatory,
      },
      dto.holidays
    )

    const cancelledLeaves = await configRepository.cancelLeavesOnHolidays(
      dto.holidays.map((h) => h.date)
    )

    return { cancelledLeaves }
  },
}

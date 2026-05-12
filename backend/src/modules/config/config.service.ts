import { configRepository } from './config.repository'
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

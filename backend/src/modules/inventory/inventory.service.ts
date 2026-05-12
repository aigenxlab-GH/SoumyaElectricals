import { inventoryRepository, getNext8Mondays } from './inventory.repository'
import { AppError } from '../../types'
import type { SaveForecastDto } from '@soumya/shared'

export const inventoryService = {
  async list() {
    return inventoryRepository.listRows()
  },

  async saveForecast(dto: SaveForecastDto, userId: string) {
    const mondays = new Set(getNext8Mondays())

    // Validate each entry: forecast_date must be one of the 8 upcoming Mondays
    for (const entry of dto.entries) {
      // Parse with local noon (T12:00:00) so getDay() returns the correct LOCAL weekday
      // regardless of server timezone — avoids UTC-midnight rollback to previous day
      const d = new Date(`${entry.forecast_date}T12:00:00`)
      if (d.getDay() !== 1) {
        throw new AppError('INVALID_DATE', `${entry.forecast_date} is not a Monday`, 400)
      }
      if (!mondays.has(entry.forecast_date)) {
        throw new AppError('INVALID_DATE', `${entry.forecast_date} is not within the next 8 upcoming Mondays`, 400)
      }
    }

    await inventoryRepository.saveForecast(dto.entries, userId)
    return { saved: dto.entries.length }
  },
}

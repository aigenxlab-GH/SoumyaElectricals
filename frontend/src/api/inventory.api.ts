import { apiClient } from './client'
import type { InventoryRow } from '@soumya/shared'
import type { SaveForecastDto } from '@soumya/shared'

export const inventoryApi = {
  async list(): Promise<InventoryRow[]> {
    const { data } = await apiClient.get<{ data: InventoryRow[] }>('/inventory')
    return data.data
  },

  async saveForecast(dto: SaveForecastDto): Promise<{ saved: number }> {
    const { data } = await apiClient.post<{ data: { saved: number } }>('/inventory/forecast', dto)
    return data.data
  },
}

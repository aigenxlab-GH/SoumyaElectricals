import { apiClient } from './client'
import type { SystemConfig, Holiday } from '../types/models'
import type { SystemConfigDto } from '@soumya/shared'

export interface SystemConfigFull extends SystemConfig {
  holidays: Holiday[]
}

export const configApi = {
  async get(): Promise<SystemConfigFull> {
    const { data } = await apiClient.get<{ data: SystemConfigFull }>('/config')
    return data.data
  },

  async save(dto: SystemConfigDto): Promise<{ message: string; cancelledLeaves: number }> {
    const { data } = await apiClient.put<{ data: { message: string; cancelledLeaves: number } }>('/config', dto)
    return data.data
  },
}

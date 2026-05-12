import { apiClient } from './client'
import type { Timecard } from '../types/models'
import type { CreateTimecardDto, BulkTimecardDto, UpdateTimecardDto } from '@soumya/shared'

export interface BulkCreateResult {
  created: Timecard[]
  skipped: number
}

export const timecardsApi = {
  async list(year: number, month: number): Promise<Timecard[]> {
    const { data } = await apiClient.get<{ data: Timecard[] }>('/timecards', { params: { year, month } })
    return data.data
  },

  async create(dto: CreateTimecardDto): Promise<Timecard> {
    const { data } = await apiClient.post<{ data: Timecard }>('/timecards', dto)
    return data.data
  },

  async createBulk(dto: BulkTimecardDto): Promise<BulkCreateResult> {
    const { data } = await apiClient.post<{ data: BulkCreateResult }>('/timecards/bulk', dto)
    return data.data
  },

  async update(id: string, dto: UpdateTimecardDto): Promise<Timecard> {
    const { data } = await apiClient.patch<{ data: Timecard }>(`/timecards/${id}`, dto)
    return data.data
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/timecards/${id}`)
  },
}

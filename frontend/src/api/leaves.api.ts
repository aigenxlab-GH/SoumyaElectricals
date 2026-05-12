import { apiClient } from './client'
import type { Leave, LeaveBalance } from '../types/models'
import type { ApplyLeaveDto, BulkLeaveDto, UpdateLeaveDto } from '@soumya/shared'

export interface BulkLeaveResult {
  created: Leave[]
  skipped: number
}

export const leavesApi = {
  async list(year: number, month: number): Promise<Leave[]> {
    const { data } = await apiClient.get<{ data: Leave[] }>('/leaves', { params: { year, month } })
    return data.data
  },

  async getBalance(): Promise<LeaveBalance> {
    const { data } = await apiClient.get<{ data: LeaveBalance }>('/leaves/balance')
    return data.data
  },

  async apply(dto: ApplyLeaveDto): Promise<BulkLeaveResult> {
    const { data } = await apiClient.post<{ data: BulkLeaveResult }>('/leaves', dto)
    return data.data
  },

  async applyBulk(dto: BulkLeaveDto): Promise<BulkLeaveResult> {
    const { data } = await apiClient.post<{ data: BulkLeaveResult }>('/leaves/bulk', dto)
    return data.data
  },

  async update(id: string, dto: UpdateLeaveDto): Promise<Leave> {
    const { data } = await apiClient.patch<{ data: Leave }>(`/leaves/${id}`, dto)
    return data.data
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/leaves/${id}`)
  },
}

import { apiClient } from './client'
import type { Overtime } from '../types/models'
import type { CreateOvertimeDto, UpdateOvertimeDto } from '@soumya/shared'

export const overtimeApi = {
  async list(year: number, month: number): Promise<Overtime[]> {
    const { data } = await apiClient.get<{ data: Overtime[] }>('/overtime', { params: { year, month } })
    return data.data
  },

  async create(dto: CreateOvertimeDto): Promise<Overtime> {
    const { data } = await apiClient.post<{ data: Overtime }>('/overtime', dto)
    return data.data
  },

  async update(id: string, dto: UpdateOvertimeDto): Promise<Overtime> {
    const { data } = await apiClient.patch<{ data: Overtime }>(`/overtime/${id}`, dto)
    return data.data
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/overtime/${id}`)
  },
}

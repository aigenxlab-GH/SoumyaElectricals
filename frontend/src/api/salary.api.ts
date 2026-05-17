import { apiClient } from './client'
import type { SalaryEntry, SetSalaryDto } from '@soumya/shared'

export const salaryApi = {
  async history(userId: string): Promise<SalaryEntry[]> {
    const { data } = await apiClient.get<{ data: SalaryEntry[] }>(`/salary/${userId}/history`)
    return data.data
  },
  async current(userId: string): Promise<{ monthly_salary: number | null }> {
    const { data } = await apiClient.get<{ data: { monthly_salary: number | null } }>(`/salary/${userId}/current`)
    return data.data
  },
  async set(userId: string, dto: SetSalaryDto): Promise<SalaryEntry> {
    const { data } = await apiClient.post<{ data: SalaryEntry }>(`/salary/${userId}`, dto)
    return data.data
  },
}

import { apiClient } from './client'
import type {
  GeneratePayrollDto, Payroll, PayrollListRow,
} from '@soumya/shared'

export const payrollApi = {
  async list(year: number, month: number): Promise<PayrollListRow[]> {
    const { data } = await apiClient.get<{ data: PayrollListRow[] }>('/payroll', { params: { year, month } })
    return data.data
  },
  async lookup(userId: string, year: number, month: number): Promise<Payroll | null> {
    const { data } = await apiClient.get<{ data: Payroll | null }>('/payroll/lookup', {
      params: { user_id: userId, year, month },
    })
    return data.data
  },
  async history(userId: string, limit = 12): Promise<Payroll[]> {
    const { data } = await apiClient.get<{ data: Payroll[] }>('/payroll/history', {
      params: { user_id: userId, limit },
    })
    return data.data
  },
  async bulkGenerate(year: number, month: number): Promise<{
    success: { user_id: string; employee_id: string; full_name: string; payroll_id: string }[]
    failed:  { user_id: string; employee_id: string; full_name: string; reason: string }[]
  }> {
    const { data } = await apiClient.post<{
      data: {
        success: { user_id: string; employee_id: string; full_name: string; payroll_id: string }[]
        failed:  { user_id: string; employee_id: string; full_name: string; reason: string }[]
      }
    }>('/payroll/bulk-generate', { period_year: year, period_month: month })
    return data.data
  },
  async getById(id: string): Promise<Payroll> {
    const { data } = await apiClient.get<{ data: Payroll }>(`/payroll/${id}`)
    return data.data
  },
  async generate(dto: GeneratePayrollDto): Promise<Payroll> {
    const { data } = await apiClient.post<{ data: Payroll }>('/payroll/generate', dto)
    return data.data
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/payroll/${id}`)
  },
}

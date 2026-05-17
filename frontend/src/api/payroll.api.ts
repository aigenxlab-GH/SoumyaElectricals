import { apiClient } from './client'
import type {
  GeneratePayrollDto, Payroll, PayrollListRow, ProcessPayrollDto,
} from '@soumya/shared'

export const payrollApi = {
  async list(year: number, month: number): Promise<PayrollListRow[]> {
    const { data } = await apiClient.get<{ data: PayrollListRow[] }>('/payroll', { params: { year, month } })
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
  async process(id: string, dto: ProcessPayrollDto): Promise<Payroll> {
    const { data } = await apiClient.post<{ data: Payroll }>(`/payroll/${id}/process`, dto)
    return data.data
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/payroll/${id}`)
  },
}

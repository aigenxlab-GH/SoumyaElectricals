import { apiClient } from './client'
import type { Quotation, QuotationDetail } from '@soumya/shared'
import type { CreateQuotationDto, UpdateQuotationDto, ProcessQuotationDto, QuotationListParams } from '@soumya/shared'

export const quotationsApi = {
  async list(params: QuotationListParams): Promise<{ data: Quotation[]; total: number }> {
    // Flatten status[] to comma-separated for a predictable query string
    const flat: Record<string, string | number | undefined> = {
      ...params,
      status: Array.isArray(params.status) ? params.status.join(',') : params.status,
    }
    const response = await apiClient.get<{ data: { data: Quotation[]; total: number } }>('/quotations', { params: flat })
    return response.data.data
  },

  async pendingList(): Promise<Quotation[]> {
    const { data } = await apiClient.get<{ data: Quotation[] }>('/quotations/pending')
    return data.data
  },

  async getById(id: string): Promise<QuotationDetail> {
    const { data } = await apiClient.get<{ data: QuotationDetail }>(`/quotations/${id}`)
    return data.data
  },

  async create(dto: CreateQuotationDto): Promise<QuotationDetail> {
    const { data } = await apiClient.post<{ data: QuotationDetail }>('/quotations', dto)
    return data.data
  },

  async update(id: string, dto: UpdateQuotationDto): Promise<QuotationDetail> {
    const { data } = await apiClient.patch<{ data: QuotationDetail }>(`/quotations/${id}`, dto)
    return data.data
  },

  async submit(id: string): Promise<Quotation> {
    const { data } = await apiClient.post<{ data: Quotation }>(`/quotations/${id}/submit`)
    return data.data
  },

  async selfApprove(id: string): Promise<Quotation> {
    const { data } = await apiClient.post<{ data: Quotation }>(`/quotations/${id}/self-approve`)
    return data.data
  },

  async selfReject(id: string): Promise<Quotation> {
    const { data } = await apiClient.post<{ data: Quotation }>(`/quotations/${id}/self-reject`)
    return data.data
  },

  async finalise(id: string): Promise<Quotation> {
    const { data } = await apiClient.post<{ data: Quotation }>(`/quotations/${id}/finalise`)
    return data.data
  },

  async cancel(id: string): Promise<Quotation> {
    const { data } = await apiClient.post<{ data: Quotation }>(`/quotations/${id}/cancel`)
    return data.data
  },

  async process(id: string, dto: ProcessQuotationDto): Promise<Quotation> {
    const { data } = await apiClient.post<{ data: Quotation }>(`/quotations/${id}/process`, dto)
    return data.data
  },

  async deleteQuotation(id: string): Promise<void> {
    await apiClient.delete(`/quotations/${id}`)
  },
}

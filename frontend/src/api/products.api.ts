import { apiClient } from './client'
import type { Product } from '@soumya/shared'
import type { CreateProductDto, UpdateProductDto, ToggleProductStatusDto } from '@soumya/shared'

export const productsApi = {
  async list(): Promise<Product[]> {
    const { data } = await apiClient.get<{ data: Product[] }>('/products')
    return data.data
  },

  async listActive(): Promise<Product[]> {
    const { data } = await apiClient.get<{ data: Product[] }>('/products/active')
    return data.data
  },

  async getById(id: string): Promise<Product> {
    const { data } = await apiClient.get<{ data: Product }>(`/products/${id}`)
    return data.data
  },

  async create(dto: CreateProductDto): Promise<Product> {
    const { data } = await apiClient.post<{ data: Product }>('/products', dto)
    return data.data
  },

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const { data } = await apiClient.patch<{ data: Product }>(`/products/${id}`, dto)
    return data.data
  },

  async toggleStatus(id: string, dto: ToggleProductStatusDto): Promise<Product> {
    const { data } = await apiClient.patch<{ data: Product }>(`/products/${id}/status`, dto)
    return data.data
  },
}

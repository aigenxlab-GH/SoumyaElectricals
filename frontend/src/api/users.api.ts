import { apiClient } from './client'
import type { User } from '../types/models'
import type { CreateUserDto, UpdateUserDto } from '@soumya/shared'

export const usersApi = {
  async list(): Promise<User[]> {
    const { data } = await apiClient.get<{ data: User[] }>('/users')
    return data.data
  },

  async getById(id: string): Promise<User> {
    const { data } = await apiClient.get<{ data: User }>(`/users/${id}`)
    return data.data
  },

  async listReportable(): Promise<User[]> {
    const { data } = await apiClient.get<{ data: User[] }>('/users/reportable')
    return data.data
  },

  async getMyManager(): Promise<User | null> {
    const { data } = await apiClient.get<{ data: User | null }>('/users/my-manager')
    return data.data
  },

  async create(dto: CreateUserDto): Promise<User> {
    const { data } = await apiClient.post<{ data: User }>('/users', dto)
    return data.data
  },

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const { data } = await apiClient.patch<{ data: User }>(`/users/${id}`, dto)
    return data.data
  },
}

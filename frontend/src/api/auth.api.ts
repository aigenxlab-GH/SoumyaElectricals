import { apiClient } from './client'
import type { LoginDto, ChangePasswordDto } from '@soumya/shared'
import type { User } from '../types/models'

export interface LoginResponse {
  access_token: string
  refresh_token: string
  user: User
}

export const authApi = {
  async login(dto: LoginDto): Promise<LoginResponse> {
    const { data } = await apiClient.post<{ data: LoginResponse }>('/auth/login', dto)
    return data.data
  },

  async changePassword(dto: ChangePasswordDto): Promise<void> {
    await apiClient.post('/auth/change-password', dto)
  },
}

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '../api/auth.api'
import { setAccessToken } from '../api/client'
import { useAuthStore } from '../store/auth.store'
import type { LoginDto, ChangePasswordDto } from '@soumya/shared'

export function useLogin() {
  const { setAuth } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: LoginDto) => authApi.login(dto),
    onSuccess: (result) => {
      queryClient.clear()
      setAccessToken(result.access_token)
      setAuth(result.user, {
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      })
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (dto: ChangePasswordDto) => authApi.changePassword(dto),
  })
}

export function useLogout() {
  const { clearAuth } = useAuthStore()
  const queryClient = useQueryClient()

  return () => {
    setAccessToken(null)
    clearAuth()
    queryClient.clear()
  }
}

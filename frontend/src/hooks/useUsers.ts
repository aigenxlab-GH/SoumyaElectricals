import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '../api/users.api'
import type { CreateUserDto, UpdateUserDto } from '@soumya/shared'

const keys = {
  list: () => ['users'] as const,
  detail: (id: string) => ['users', id] as const,
  reportable: () => ['users', 'reportable'] as const,
  myManager: () => ['users', 'my-manager'] as const,
}

export function useUsers(opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: keys.list(),
    queryFn:  () => usersApi.list(),
    enabled:  opts.enabled ?? true,
  })
}

export function useUser(id: string) {
  return useQuery({ queryKey: keys.detail(id), queryFn: () => usersApi.getById(id) })
}

export function useReportableUsers(opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: keys.reportable(),
    queryFn:  () => usersApi.listReportable(),
    enabled:  opts.enabled ?? true,
  })
}

export function useMyManager() {
  return useQuery({ queryKey: keys.myManager(), queryFn: () => usersApi.getMyManager() })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateUserDto) => usersApi.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list() }),
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (userId: string) => usersApi.resetPassword(userId),
  })
}

export function useUpdateUser(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: UpdateUserDto) => usersApi.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.list() })
      qc.invalidateQueries({ queryKey: keys.detail(id) })
    },
  })
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { salaryApi } from '../api/salary.api'
import type { SetSalaryDto } from '@soumya/shared'

const keys = {
  history: (userId: string) => ['salary', userId, 'history'] as const,
  current: (userId: string) => ['salary', userId, 'current'] as const,
}

export function useSalaryHistory(userId: string, opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: keys.history(userId),
    queryFn:  () => salaryApi.history(userId),
    enabled:  opts.enabled ?? !!userId,
  })
}

export function useCurrentSalary(userId: string, opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: keys.current(userId),
    queryFn:  () => salaryApi.current(userId),
    enabled:  opts.enabled ?? !!userId,
  })
}

export function useSetSalary(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: SetSalaryDto) => salaryApi.set(userId, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.history(userId) })
      qc.invalidateQueries({ queryKey: keys.current(userId) })
    },
  })
}

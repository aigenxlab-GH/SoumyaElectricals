import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { leavesApi } from '../api/leaves.api'
import type { ApplyLeaveDto, BulkLeaveDto, UpdateLeaveDto } from '@soumya/shared'

const keys = {
  list: (year: number, month: number) => ['leaves', year, month] as const,
  balance: () => ['leave-balance'] as const,
}

export function useLeaves(year: number, month: number) {
  return useQuery({
    queryKey: keys.list(year, month),
    queryFn: () => leavesApi.list(year, month),
  })
}

export function useLeaveBalance() {
  return useQuery({
    queryKey: keys.balance(),
    queryFn: () => leavesApi.getBalance(),
  })
}

export function useApplyLeave(year: number, month: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: ApplyLeaveDto) => leavesApi.apply(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.list(year, month) })
      qc.invalidateQueries({ queryKey: keys.balance() })
    },
  })
}

export function useApplyBulkLeave(year: number, month: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: BulkLeaveDto) => leavesApi.applyBulk(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.list(year, month) })
      qc.invalidateQueries({ queryKey: keys.balance() })
    },
  })
}

export function useUpdateLeave(year: number, month: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateLeaveDto }) => leavesApi.update(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list(year, month) }),
  })
}

export function useDeleteLeave(year: number, month: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => leavesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.list(year, month) })
      qc.invalidateQueries({ queryKey: keys.balance() })
    },
  })
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { timecardsApi } from '../api/timecards.api'
import type { CreateTimecardDto, BulkTimecardDto, UpdateTimecardDto } from '@soumya/shared'

const keys = {
  list: (year: number, month: number) => ['timecards', year, month] as const,
}

export function useTimecards(year: number, month: number) {
  return useQuery({
    queryKey: keys.list(year, month),
    queryFn: () => timecardsApi.list(year, month),
  })
}

export function useCreateTimecard(year: number, month: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateTimecardDto) => timecardsApi.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list(year, month) }),
  })
}

export function useBulkCreateTimecards(year: number, month: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: BulkTimecardDto) => timecardsApi.createBulk(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list(year, month) }),
  })
}

export function useUpdateTimecard(year: number, month: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateTimecardDto }) => timecardsApi.update(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list(year, month) }),
  })
}

export function useDeleteTimecard(year: number, month: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => timecardsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list(year, month) }),
  })
}

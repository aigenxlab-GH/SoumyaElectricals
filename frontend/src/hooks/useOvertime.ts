import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { overtimeApi } from '../api/overtime.api'
import type { CreateOvertimeDto, UpdateOvertimeDto } from '@soumya/shared'

const keys = {
  list: (year: number, month: number) => ['overtime', year, month] as const,
}

export function useOvertime(year: number, month: number) {
  return useQuery({
    queryKey: keys.list(year, month),
    queryFn: () => overtimeApi.list(year, month),
  })
}

export function useCreateOvertime(year: number, month: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateOvertimeDto) => overtimeApi.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list(year, month) }),
  })
}

export function useUpdateOvertime(year: number, month: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateOvertimeDto }) => overtimeApi.update(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list(year, month) }),
  })
}

export function useDeleteOvertime(year: number, month: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => overtimeApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list(year, month) }),
  })
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { payrollApi } from '../api/payroll.api'
import type { GeneratePayrollDto, ProcessPayrollDto } from '@soumya/shared'

const keys = {
  all:    () => ['payroll'] as const,
  list:   (y: number, m: number) => ['payroll', 'list', y, m] as const,
  detail: (id: string) => ['payroll', 'detail', id] as const,
}

export function usePayrollList(year: number, month: number, opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: keys.list(year, month),
    queryFn:  () => payrollApi.list(year, month),
    enabled:  opts.enabled ?? true,
    placeholderData: (prev) => prev,
  })
}

export function usePayroll(id: string) {
  return useQuery({
    queryKey: keys.detail(id),
    queryFn:  () => payrollApi.getById(id),
    enabled:  !!id,
  })
}

export function useGeneratePayroll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: GeneratePayrollDto) => payrollApi.generate(dto),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: keys.all() })
      qc.invalidateQueries({ queryKey: keys.detail(p.id) })
    },
  })
}

export function useProcessPayroll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ProcessPayrollDto }) => payrollApi.process(id, dto),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: keys.all() })
      qc.invalidateQueries({ queryKey: keys.detail(p.id) })
    },
  })
}

export function useDeletePayroll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => payrollApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all() }),
  })
}

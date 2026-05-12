import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { quotationsApi } from '../api/quotations.api'
import type { CreateQuotationDto, UpdateQuotationDto, ProcessQuotationDto, QuotationListParams } from '@soumya/shared'

const INV_KEY = ['inventory'] as const

const keys = {
  all:     ()                       => ['quotations'] as const,
  lists:   ()                       => ['quotations', 'list'] as const,
  list:    (p: QuotationListParams) => ['quotations', 'list', p] as const,
  pending: ()                       => ['quotations', 'pending'] as const,
  detail:  (id: string)             => ['quotations', id] as const,
}

/** Returns the default 90-day date range for the quotation list filter */
export function defaultDateRange(): { dateFrom: string; dateTo: string } {
  const today = new Date()
  const from  = new Date(today)
  from.setDate(from.getDate() - 90)
  return {
    dateFrom: from.toISOString().split('T')[0],
    dateTo:   today.toISOString().split('T')[0],
  }
}

export function useQuotations(params: QuotationListParams) {
  return useQuery({
    queryKey: keys.list(params),
    queryFn:  () => quotationsApi.list(params),
    placeholderData: (prev) => prev,   // keeps previous page visible while new page loads
  })
}

export function usePendingQuotations(opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: keys.pending(),
    queryFn: () => quotationsApi.pendingList(),
    enabled: opts.enabled ?? true,
  })
}

export function useQuotation(id: string) {
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: () => quotationsApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateQuotation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateQuotationDto) => quotationsApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.lists() })
      qc.invalidateQueries({ queryKey: INV_KEY })
    },
  })
}

export function useUpdateQuotation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateQuotationDto }) => quotationsApi.update(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: keys.lists() })
      qc.invalidateQueries({ queryKey: keys.detail(id) })
      qc.invalidateQueries({ queryKey: INV_KEY })
    },
  })
}

export function useSubmitQuotation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => quotationsApi.submit(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: keys.lists() })
      qc.invalidateQueries({ queryKey: keys.detail(id) })
    },
  })
}

export function useSelfApproveQuotation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => quotationsApi.selfApprove(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: keys.lists() })
      qc.invalidateQueries({ queryKey: keys.detail(id) })
      qc.invalidateQueries({ queryKey: keys.pending() })
    },
  })
}

export function useSelfRejectQuotation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => quotationsApi.selfReject(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: keys.lists() })
      qc.invalidateQueries({ queryKey: keys.detail(id) })
      qc.invalidateQueries({ queryKey: keys.pending() })
      qc.invalidateQueries({ queryKey: INV_KEY })
    },
  })
}

export function useFinaliseQuotation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => quotationsApi.finalise(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: keys.lists() })
      qc.invalidateQueries({ queryKey: keys.detail(id) })
      qc.invalidateQueries({ queryKey: INV_KEY })
    },
  })
}

export function useCancelQuotation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => quotationsApi.cancel(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: keys.lists() })
      qc.invalidateQueries({ queryKey: keys.detail(id) })
      qc.invalidateQueries({ queryKey: INV_KEY })
    },
  })
}

export function useProcessQuotation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ProcessQuotationDto }) => quotationsApi.process(id, dto),
    onSuccess: (_, { id, dto }) => {
      qc.invalidateQueries({ queryKey: keys.lists() })
      qc.invalidateQueries({ queryKey: keys.pending() })
      qc.invalidateQueries({ queryKey: keys.detail(id) })
      if (dto.action === 'reject') {
        qc.invalidateQueries({ queryKey: INV_KEY })
      }
    },
  })
}

export function useDeleteQuotation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => quotationsApi.deleteQuotation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.lists() })
    },
  })
}

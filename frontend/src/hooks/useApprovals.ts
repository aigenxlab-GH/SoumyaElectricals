import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { approvalsApi } from '../api/approvals.api'

const keys = {
  timecards: () => ['approvals', 'timecards'] as const,
  leaves: () => ['approvals', 'leaves'] as const,
  overtimes: () => ['approvals', 'overtimes'] as const,
}

export function useTimecardApprovals() {
  return useQuery({ queryKey: keys.timecards(), queryFn: () => approvalsApi.listTimecards() })
}

export function useLeaveApprovals() {
  return useQuery({ queryKey: keys.leaves(), queryFn: () => approvalsApi.listLeaves() })
}

export function useProcessTimecardApproval() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      approvalsApi.processTimecard(id, action),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.timecards() }),
  })
}

export function useProcessLeaveApproval() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      approvalsApi.processLeave(id, action),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.leaves() }),
  })
}

export function useBulkProcessTimecardApproval() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ ids, action }: { ids: string[]; action: 'approve' | 'reject' }) => {
      await Promise.all(ids.map((id) => approvalsApi.processTimecard(id, action)))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.timecards() }),
  })
}

export function useBulkProcessLeaveApproval() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ ids, action }: { ids: string[]; action: 'approve' | 'reject' }) => {
      await Promise.all(ids.map((id) => approvalsApi.processLeave(id, action)))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.leaves() }),
  })
}

export function useOvertimeApprovals() {
  return useQuery({ queryKey: keys.overtimes(), queryFn: () => approvalsApi.listOvertimes() })
}

export function useProcessOvertimeApproval() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      approvalsApi.processOvertime(id, action),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.overtimes() }),
  })
}

export function useBulkProcessOvertimeApproval() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ ids, action }: { ids: string[]; action: 'approve' | 'reject' }) => {
      await Promise.all(ids.map((id) => approvalsApi.processOvertime(id, action)))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.overtimes() }),
  })
}

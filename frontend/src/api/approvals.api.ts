import { apiClient } from './client'
import type { Timecard, Leave, Overtime } from '../types/models'
import type { ApprovalTimecard, ApprovalLeave, ApprovalOvertime } from '../types/approvals'

export const approvalsApi = {
  async listTimecards(): Promise<ApprovalTimecard[]> {
    const { data } = await apiClient.get<{ data: ApprovalTimecard[] }>('/approvals/timecards')
    return data.data
  },

  async listLeaves(): Promise<ApprovalLeave[]> {
    const { data } = await apiClient.get<{ data: ApprovalLeave[] }>('/approvals/leaves')
    return data.data
  },

  async listOvertimes(): Promise<ApprovalOvertime[]> {
    const { data } = await apiClient.get<{ data: ApprovalOvertime[] }>('/approvals/overtimes')
    return data.data
  },

  async processTimecard(id: string, action: 'approve' | 'reject'): Promise<Timecard> {
    const { data } = await apiClient.post<{ data: Timecard }>(`/approvals/timecards/${id}`, { action })
    return data.data
  },

  async processLeave(id: string, action: 'approve' | 'reject'): Promise<Leave> {
    const { data } = await apiClient.post<{ data: Leave }>(`/approvals/leaves/${id}`, { action })
    return data.data
  },

  async processOvertime(id: string, action: 'approve' | 'reject'): Promise<Overtime> {
    const { data } = await apiClient.post<{ data: Overtime }>(`/approvals/overtimes/${id}`, { action })
    return data.data
  },
}

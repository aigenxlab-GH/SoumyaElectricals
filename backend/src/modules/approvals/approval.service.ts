import { approvalRepository } from './approval.repository'
import type { AuthUser } from '../../types'

export const approvalService = {
  async listTimecards(approver: AuthUser) {
    if (approver.role === 'owner') {
      return approvalRepository.listAllPendingTimecards()
    }
    return approvalRepository.listPendingTimecardsByManager(approver.id)
  },

  async listLeaves(approver: AuthUser) {
    if (approver.role === 'owner') {
      return approvalRepository.listAllPendingLeaves()
    }
    return approvalRepository.listPendingLeavesByManager(approver.id)
  },

  async listOvertimes(approver: AuthUser) {
    if (approver.role === 'owner') {
      return approvalRepository.listAllPendingOvertimes()
    }
    return approvalRepository.listPendingOvertimesByManager(approver.id)
  },

  async processTimecard(id: string, action: 'approve' | 'reject') {
    if (action === 'approve') return approvalRepository.approveTimecard(id)
    return approvalRepository.rejectTimecard(id)
  },

  async processLeave(id: string, action: 'approve' | 'reject') {
    if (action === 'approve') return approvalRepository.approveLeave(id)
    return approvalRepository.rejectLeave(id)
  },

  async processOvertime(id: string, action: 'approve' | 'reject') {
    if (action === 'approve') return approvalRepository.approveOvertime(id)
    return approvalRepository.rejectOvertime(id)
  },
}

import type { Timecard, Leave, Overtime } from '@soumya/shared'

interface UserSummary {
  full_name: string
  employee_id: string
  manager_id: string | null
  role?: string
}

export interface ApprovalTimecard extends Timecard {
  users: UserSummary | null
}

export interface ApprovalLeave extends Leave {
  users: UserSummary | null
}

export interface ApprovalOvertime extends Overtime {
  users: UserSummary | null
}

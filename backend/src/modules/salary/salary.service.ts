import { salaryRepository } from './salary.repository'
import type { SetSalaryDto } from '@soumya/shared'
import type { AuthUser } from '../../types'

export const salaryService = {
  /** History for a user (owner only — controller enforces role). */
  list(userId: string) {
    return salaryRepository.listForUser(userId)
  },

  /** Current salary for a user (owner only). */
  current(userId: string) {
    const today = new Date().toISOString().split('T')[0]
    return salaryRepository.getSalaryAt(userId, today)
  },

  /** Set / update salary (owner only). */
  set(userId: string, dto: SetSalaryDto, actor: AuthUser) {
    return salaryRepository.setSalary({
      user_id:        userId,
      monthly_salary: dto.monthly_salary,
      effective_from: dto.effective_from,
      note:           dto.note,
      created_by:     actor.id,
    })
  },
}

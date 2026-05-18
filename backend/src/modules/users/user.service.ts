import { supabase } from '../../lib/supabase'
import { AppError } from '../../types'
import { formatEmployeeId, employeeIdToEmail } from '../../utils/employee-id'
import { configRepository } from '../config/config.repository'
import { userRepository } from './user.repository'
import type { CreateUserDto, UpdateUserDto } from './user.schema'

const DEFAULT_PASSWORD = '12345678'

export const userService = {
  async list() {
    return userRepository.list()
  },

  async getById(id: string) {
    const user = await userRepository.findById(id)
    if (!user) throw new AppError('NOT_FOUND', 'User not found', 404)
    return user
  },

  async getByIdWithAadhaar(id: string) {
    const user = await userRepository.findById(id, true)
    if (!user) throw new AppError('NOT_FOUND', 'User not found', 404)
    return user
  },

  async listReportable(managerId: string) {
    return userRepository.listReportableUsers(managerId)
  },

  /**
   * creatorId — the ID of the owner performing the creation.
   * Used to auto-assign manager_id for Manager and Owner roles.
   */
  async create(dto: CreateUserDto, creatorId: string) {
    // Duplicate Aadhaar check
    const existingAadhaar = await userRepository.findByAadhaar(dto.aadhaar)
    if (existingAadhaar) {
      throw new AppError(
        'DUPLICATE_AADHAAR',
        'An account already exists with the same Aadhaar number.',
        409
      )
    }

    // Auto-assign manager_id:
    //   - Employee → use dto.manager_id (selected by form)
    //   - Manager  → auto-assign the creating owner as manager
    //   - Owner    → auto-assign the creating owner as manager
    let managerId: string | null = dto.manager_id ?? null
    if (dto.role === 'manager' || dto.role === 'owner') {
      managerId = creatorId
    }

    const seq = await userRepository.getNextSequence()
    const employeeId = formatEmployeeId(seq)
    const syntheticEmail = employeeIdToEmail(employeeId)

    const sysConfig = await configRepository.getSystemConfig()

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: syntheticEmail,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      throw new AppError('AUTH_CREATE_FAILED', authError?.message ?? 'Failed to create auth user', 500)
    }

    const user = await userRepository.create({
      id: authData.user.id,
      employee_id: employeeId,
      full_name: dto.full_name,
      role: dto.role,
      sex: dto.sex,
      date_of_birth: dto.date_of_birth,
      date_of_joining: dto.date_of_joining,
      aadhaar: dto.aadhaar,
      manager_id: managerId,
      is_default_password: true,
      is_active: true,
      phone: dto.phone,
      address: dto.address,
      email: dto.email ?? null,
    })

    // Credit one month's allocation on joining (annual / 12, floored)
    const monthlyCredit = Math.floor(sysConfig.annual_leave_days / 12)
    await supabase
      .from('leave_balance')
      .insert({ user_id: user.id, total_credited: monthlyCredit, used: 0, remaining: monthlyCredit })

    // Optionally seed salary_history if monthly_salary was provided at creation
    if (dto.monthly_salary && dto.monthly_salary > 0) {
      await supabase.from('salary_history').insert({
        user_id:        user.id,
        monthly_salary: dto.monthly_salary,
        effective_from: dto.date_of_joining,
        note:           'Set at user creation',
        created_by:     creatorId,
      })
    }

    return user
  },

  async update(id: string, dto: UpdateUserDto) {
    const existing = await userRepository.findById(id)
    if (!existing) throw new AppError('NOT_FOUND', 'User not found', 404)

    if (existing.role === 'manager' && dto.role === 'employee') {
      const linked = await userRepository.countLinkedEmployees(id)
      if (linked > 0) {
        throw new AppError(
          'LINKED_EMPLOYEES',
          `Cannot change role while ${linked} employee(s) are linked. Remove their manager assignment first.`,
          400
        )
      }
    }

    return userRepository.update(id, dto)
  },

  /**
   * Owner-only. Resets a user's password back to DEFAULT_PASSWORD ("12345678")
   * and flips is_default_password=true so the user is forced to change on next login.
   * Used when an employee forgets their password — owner doesn't see/store the new password.
   */
  async resetPassword(targetUserId: string, actorId: string) {
    const target = await userRepository.findById(targetUserId)
    if (!target) throw new AppError('NOT_FOUND', 'User not found', 404)
    if (target.id === actorId) {
      throw new AppError('FORBIDDEN', 'You cannot reset your own password here — use the Change Password page', 400)
    }
    if (target.role === 'owner') {
      throw new AppError('FORBIDDEN', 'Cannot reset another owner\'s password', 400)
    }

    const { error: authError } = await supabase.auth.admin.updateUserById(target.id, {
      password: DEFAULT_PASSWORD,
    })
    if (authError) throw new AppError('AUTH_UPDATE_FAILED', authError.message, 500)

    const { error: dbError } = await supabase
      .from('users')
      .update({ is_default_password: true, updated_at: new Date().toISOString() })
      .eq('id', target.id)
    if (dbError) throw new AppError('DB_ERROR', dbError.message, 500)

    return { employee_id: target.employee_id, full_name: target.full_name, default_password: DEFAULT_PASSWORD }
  },

  /**
   * Owner-only. Permanently removes an inactive user from the system.
   *
   * Rules:
   *   • Cannot delete an owner
   *   • Cannot delete yourself
   *   • Cannot delete an active user — owner must deactivate first
   *   • Cannot delete a manager who still has direct reports
   *
   * Cleanup:
   *   • Nulls out user references on rows that should outlive the user
   *     (products.created_by, quotations.created_by/approved_by/rejected_by,
   *      inventory_forecast.created_by, payrolls.generated_by, salary_history.created_by)
   *   • DELETE from users cascades through leave_balance / timecards / leaves /
   *     overtime / payrolls.user_id / salary_history.user_id
   *   • Then deletes the auth.users row via Supabase Admin API
   */
  async deleteUser(targetUserId: string, actorId: string) {
    const target = await userRepository.findById(targetUserId)
    if (!target) throw new AppError('NOT_FOUND', 'User not found', 404)
    if (target.id === actorId) {
      throw new AppError('FORBIDDEN', 'You cannot delete your own account', 400)
    }
    if (target.role === 'owner') {
      throw new AppError('FORBIDDEN', 'Owner accounts cannot be deleted', 400)
    }
    if (target.is_active) {
      throw new AppError('USER_ACTIVE', 'Deactivate the user first before deleting them', 400)
    }

    if (target.role === 'manager') {
      const linked = await userRepository.countLinkedEmployees(target.id)
      if (linked > 0) {
        throw new AppError(
          'LINKED_EMPLOYEES',
          `Cannot delete — ${linked} employee(s) still report to this manager. Reassign them first.`,
          400
        )
      }
    }

    // 1. NULL out FK references that should survive the user's deletion
    const nullOps: Array<{ table: string; column: string }> = [
      { table: 'products',           column: 'created_by'    },
      { table: 'quotations',         column: 'created_by'    },
      { table: 'quotations',         column: 'approved_by'   },
      { table: 'quotations',         column: 'rejected_by'   },
      { table: 'inventory_forecast', column: 'created_by'    },
      { table: 'payrolls',           column: 'generated_by'  },
      { table: 'salary_history',     column: 'created_by'    },
    ]
    for (const { table, column } of nullOps) {
      const { error } = await supabase.from(table).update({ [column]: null }).eq(column, target.id)
      // Tables that might not exist (older DBs) or rows that don't exist — non-fatal
      if (error && !/does not exist/i.test(error.message)) {
        throw new AppError('DB_ERROR', `Cleanup on ${table}.${column} failed: ${error.message}`, 500)
      }
    }

    // 2. Delete from public.users (cascades to leave_balance, timecards, leaves,
    //    overtime, payrolls.user_id, salary_history.user_id via ON DELETE CASCADE)
    const { error: delErr } = await supabase.from('users').delete().eq('id', target.id)
    if (delErr) throw new AppError('DB_ERROR', `Failed to delete user: ${delErr.message}`, 500)

    // 3. Remove the auth.users row (also drops auth.identities / sessions / refresh_tokens via CASCADE)
    const { error: authErr } = await supabase.auth.admin.deleteUser(target.id)
    if (authErr) {
      // Public row is gone; auth row failed. Surface a warning but don't fail the operation.
      console.warn(`auth.users delete failed for ${target.employee_id}: ${authErr.message}`)
    }

    return { employee_id: target.employee_id, full_name: target.full_name }
  },
}

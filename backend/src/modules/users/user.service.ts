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
}

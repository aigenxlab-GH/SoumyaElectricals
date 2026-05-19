import { supabase, supabaseAuth } from '../../lib/supabase'
import { AppError } from '../../types'
import { employeeIdToEmail } from '../../utils/employee-id'
import { authRepository } from './auth.repository'
import type { LoginDto, ChangePasswordDto } from './auth.schema'

export const authService = {
  async login(dto: LoginDto) {
    const employeeId = dto.employee_id.toUpperCase()
    const syntheticEmail = employeeIdToEmail(employeeId)

    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email: syntheticEmail,
      password: dto.password,
    })

    if (error || !data.session) {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid employee ID or password', 401)
    }

    const user = await authRepository.findUserByEmployeeId(employeeId)

    // Back-fill leave_balance so it reflects months elapsed since joining.
    // Idempotent — safe to call on every login. Errors are non-fatal.
    if (user?.id) {
      const { error: rpcErr } = await supabase.rpc('recompute_leave_balance', { p_user_id: user.id })
      if (rpcErr) console.warn('recompute_leave_balance failed:', rpcErr.message)
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user,
    }
  },

  async changePassword(userId: string, employeeId: string, dto: ChangePasswordDto) {
    const syntheticEmail = employeeIdToEmail(employeeId.toUpperCase())

    const { error: signInError } = await supabaseAuth.auth.signInWithPassword({
      email: syntheticEmail,
      password: dto.old_password,
    })

    if (signInError) {
      throw new AppError('INVALID_CREDENTIALS', 'Current password is incorrect', 401)
    }

    // admin.updateUserById uses the service role key directly — safe on the DB client
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: dto.new_password,
    })

    if (updateError) {
      throw new AppError('PASSWORD_UPDATE_FAILED', updateError.message, 500)
    }

    await authRepository.markPasswordChanged(userId)
  },
}

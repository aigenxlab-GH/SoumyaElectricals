import { supabase } from '../../lib/supabase'
import { AppError } from '../../types'

export const authRepository = {
  async findUserByEmployeeId(employeeId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('id, employee_id, full_name, role, is_default_password, manager_id, sex, date_of_birth, date_of_joining, phone, address, email, is_active, created_at, updated_at')
      .eq('employee_id', employeeId)
      .eq('is_active', true)
      .single()

    if (error) throw new AppError('USER_NOT_FOUND', 'Invalid employee ID or password', 401)
    return data
  },

  async markPasswordChanged(userId: string) {
    const { error } = await supabase
      .from('users')
      .update({ is_default_password: false })
      .eq('id', userId)

    if (error) throw new AppError('DB_ERROR', error.message, 500)
  },
}

import { supabase } from '../../lib/supabase'
import { AppError } from '../../types'

export const dashboardRepository = {
  async getEmployeeStats(userId: string) {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const [timecards, leaves, balance] = await Promise.all([
      supabase
        .from('timecards')
        .select('status', { count: 'exact' })
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate),
      supabase
        .from('leaves')
        .select('status', { count: 'exact' })
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate),
      supabase
        .from('leave_balance')
        .select('remaining')
        .eq('user_id', userId)
        .single(),
    ])

    if (timecards.error) throw new AppError('DB_ERROR', timecards.error.message, 500)
    if (leaves.error) throw new AppError('DB_ERROR', leaves.error.message, 500)

    return {
      timecards_this_month: timecards.count ?? 0,
      leaves_this_month: leaves.count ?? 0,
      leave_balance_remaining: balance.data?.remaining ?? 0,
    }
  },

  async getOwnerPendingCounts() {
    const [timecards, leaves] = await Promise.all([
      supabase.from('timecards').select('*', { count: 'exact', head: true }).eq('status', 'applied'),
      supabase.from('leaves').select('*', { count: 'exact', head: true }).eq('status', 'applied'),
    ])

    return {
      pending_timecards: timecards.count ?? 0,
      pending_leaves: leaves.count ?? 0,
    }
  },

  async getManagerPendingCounts(managerId: string) {
    // Find all employees directly under this manager
    const { data: employees } = await supabase
      .from('users')
      .select('id')
      .eq('manager_id', managerId)
      .eq('is_active', true)

    const employeeIds = (employees ?? []).map((e) => e.id)

    const [timecards, leaves, balance] = await Promise.all([
      employeeIds.length > 0
        ? supabase
            .from('timecards')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'applied')
            .in('user_id', employeeIds)
        : Promise.resolve({ count: 0 }),
      employeeIds.length > 0
        ? supabase
            .from('leaves')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'applied')
            .in('user_id', employeeIds)
        : Promise.resolve({ count: 0 }),
      supabase
        .from('leave_balance')
        .select('remaining')
        .eq('user_id', managerId)
        .single(),
    ])

    return {
      pending_timecards: timecards.count ?? 0,
      pending_leaves: leaves.count ?? 0,
      leave_balance_remaining: (balance as { data?: { remaining?: number } }).data?.remaining ?? 0,
    }
  },
}

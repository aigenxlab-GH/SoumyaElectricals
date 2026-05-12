import { supabase } from '../../lib/supabase'
import { AppError } from '../../types'
import type { SystemConfig, Holiday } from '@soumya/shared'

export const configRepository = {
  async getSystemConfig(): Promise<SystemConfig> {
    const { data, error } = await supabase.from('system_config').select('*').single()
    if (error || !data) throw new AppError('CONFIG_MISSING', 'System configuration not found', 500)
    return data
  },

  async getHolidays(): Promise<Holiday[]> {
    const { data, error } = await supabase.from('holidays').select('*').order('date')
    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return data ?? []
  },

  async getHolidayDates(): Promise<string[]> {
    const holidays = await configRepository.getHolidays()
    return holidays.map((h) => h.date)
  },

  async saveConfig(
    config: Omit<SystemConfig, 'id' | 'updated_at'>,
    holidays: Omit<Holiday, 'id'>[]
  ): Promise<void> {
    // Fetch the existing row ID so we can update by primary key
    const { data: existing, error: fetchErr } = await supabase
      .from('system_config')
      .select('id')
      .single()
    if (fetchErr || !existing) throw new AppError('CONFIG_MISSING', 'System configuration not found', 500)

    const { error: cfgError } = await supabase
      .from('system_config')
      .update({ ...config, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    if (cfgError) throw new AppError('DB_ERROR', cfgError.message, 500)

    // Delete all existing holidays — date is DATE NOT NULL so gte filter matches all rows
    const { error: delError } = await supabase
      .from('holidays')
      .delete()
      .gte('date', '1900-01-01')
    if (delError) throw new AppError('DB_ERROR', delError.message, 500)

    if (holidays.length > 0) {
      const { error: insError } = await supabase.from('holidays').insert(holidays)
      if (insError) throw new AppError('DB_ERROR', insError.message, 500)
    }
  },

  async cancelLeavesOnHolidays(dates: string[]): Promise<number> {
    if (dates.length === 0) return 0

    // Find all applied + approved leaves on any of the holiday dates
    const { data: leaves, error: fetchErr } = await supabase
      .from('leaves')
      .select('id, user_id')
      .in('date', dates)
      .in('status', ['applied', 'approved'])

    if (fetchErr) throw new AppError('DB_ERROR', fetchErr.message, 500)
    if (!leaves || leaves.length === 0) return 0

    // Delete all affected leaves
    const leaveIds = leaves.map((l) => l.id)
    const { error: delErr } = await supabase.from('leaves').delete().in('id', leaveIds)
    if (delErr) throw new AppError('DB_ERROR', delErr.message, 500)

    // Count days to restore per user and restore balances
    const daysByUser = leaves.reduce<Record<string, number>>((acc, l) => {
      acc[l.user_id] = (acc[l.user_id] ?? 0) + 1
      return acc
    }, {})

    const restoreErrors = await Promise.all(
      Object.entries(daysByUser).map(async ([userId, days]) => {
        const { error } = await supabase.rpc('restore_leave_balance', { p_user_id: userId, p_days: days })
        return error
      })
    )

    const firstRestoreError = restoreErrors.find(Boolean)
    if (firstRestoreError) throw new AppError('DB_ERROR', firstRestoreError.message, 500)

    return leaves.length
  },
}

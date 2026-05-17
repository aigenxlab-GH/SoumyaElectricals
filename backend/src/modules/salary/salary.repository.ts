import { supabase } from '../../lib/supabase'
import { AppError } from '../../types'
import type { SalaryEntry } from '@soumya/shared'

export const salaryRepository = {
  /** History of salary changes for a user — most recent first. */
  async listForUser(userId: string): Promise<SalaryEntry[]> {
    const { data, error } = await supabase
      .from('salary_history')
      .select('*')
      .eq('user_id', userId)
      .order('effective_from', { ascending: false })
    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return data ?? []
  },

  /** Salary applicable for a user on a given date — returns null if no entry exists yet. */
  async getSalaryAt(userId: string, atDate: string): Promise<number | null> {
    const { data, error } = await supabase.rpc('get_salary_at', {
      p_user_id: userId,
      p_at_date: atDate,
    })
    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return data === null ? null : Number(data)
  },

  /** Bulk salary lookup by user_id for a date. Returns { userId: salary } map. */
  async getSalariesAt(userIds: string[], atDate: string): Promise<Record<string, number | null>> {
    const map: Record<string, number | null> = {}
    await Promise.all(userIds.map(async (id) => {
      map[id] = await salaryRepository.getSalaryAt(id, atDate)
    }))
    return map
  },

  async setSalary(input: {
    user_id: string
    monthly_salary: number
    effective_from: string
    note?: string
    created_by: string
  }): Promise<SalaryEntry> {
    // Upsert on (user_id, effective_from) so editing today's salary replaces today's row
    const { data, error } = await supabase
      .from('salary_history')
      .upsert({
        user_id:        input.user_id,
        monthly_salary: input.monthly_salary,
        effective_from: input.effective_from,
        note:           input.note ?? null,
        created_by:     input.created_by,
      }, { onConflict: 'user_id,effective_from' })
      .select()
      .single()
    if (error || !data) throw new AppError('DB_ERROR', error?.message ?? 'Failed to set salary', 500)
    return data
  },
}

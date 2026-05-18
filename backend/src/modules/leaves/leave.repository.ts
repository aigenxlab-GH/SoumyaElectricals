import { supabase } from '../../lib/supabase'
import { AppError } from '../../types'
import type { Leave, LeaveBalance } from '@soumya/shared'

export const leaveRepository = {
  async listByMonth(userId: string, year: number, month: number): Promise<Leave[]> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`

    const { data, error } = await supabase
      .from('leaves')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return data ?? []
  },

  async findById(id: string): Promise<Leave | null> {
    const { data } = await supabase.from('leaves').select('*').eq('id', id).single()
    return data
  },

  async findExistingDates(userId: string, dates: string[]): Promise<string[]> {
    const { data, error } = await supabase
      .from('leaves')
      .select('date')
      .eq('user_id', userId)
      .in('date', dates)

    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return (data ?? []).map((r) => r.date)
  },

  async insertMany(userId: string, dates: string[], reason: string): Promise<Leave[]> {
    const rows = dates.map((date) => ({ user_id: userId, date, reason, status: 'applied' }))
    const { data, error } = await supabase.from('leaves').insert(rows).select()
    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return data ?? []
  },

  async update(id: string, reason: string): Promise<Leave> {
    const { data, error } = await supabase
      .from('leaves')
      .update({ reason })
      .eq('id', id)
      .eq('status', 'applied')
      .select()
      .single()

    if (error || !data) throw new AppError('NOT_FOUND', 'Leave not found or not editable', 404)
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('leaves').delete().eq('id', id).eq('status', 'applied')
    if (error) throw new AppError('DB_ERROR', error.message, 500)
  },

  async getBalance(userId: string): Promise<LeaveBalance> {
    const { data, error } = await supabase
      .from('leave_balance')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error || !data) throw new AppError('NOT_FOUND', 'Leave balance record not found', 404)
    return data
  },

  /** V26 authoritative balance — recalculates from approved leaves + carryover + write-offs. */
  async recomputeBalance(userId: string): Promise<void> {
    const { error } = await supabase.rpc('recompute_leave_balance', { p_user_id: userId })
    if (error) throw new AppError('DB_ERROR', error.message, 500)
  },

  async updateStatus(id: string, status: 'approved' | 'rejected'): Promise<Leave> {
    const { data, error } = await supabase
      .from('leaves')
      .update({ status })
      .eq('id', id)
      .eq('status', 'applied')
      .select()
      .single()

    if (error || !data) throw new AppError('CONFLICT', 'Leave already processed or not found', 409)
    return data
  },
}

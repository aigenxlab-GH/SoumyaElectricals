import { supabase } from '../../lib/supabase'
import { AppError } from '../../types'
import type { Payroll } from '@soumya/shared'

type PayrollInsert = Omit<Payroll, 'id' | 'generated_at' | 'updated_at' | 'finalised_at' | 'paid_at'>

export const payrollRepository = {
  async findByUserAndPeriod(userId: string, year: number, month: number): Promise<Payroll | null> {
    const { data, error } = await supabase
      .from('payrolls')
      .select('*')
      .eq('user_id', userId)
      .eq('period_year', year)
      .eq('period_month', month)
      .maybeSingle()
    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return data ?? null
  },

  async findById(id: string): Promise<Payroll | null> {
    const { data, error } = await supabase.from('payrolls').select('*').eq('id', id).maybeSingle()
    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return data ?? null
  },

  /** Last N payrolls for a single user, newest first. */
  async listForUser(userId: string, limit = 12): Promise<Payroll[]> {
    const { data, error } = await supabase
      .from('payrolls')
      .select('*')
      .eq('user_id', userId)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })
      .limit(limit)
    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return data ?? []
  },

  async listForPeriod(filter: {
    year: number; month: number; userIds?: string[]
  }): Promise<Payroll[]> {
    let q = supabase
      .from('payrolls')
      .select('*')
      .eq('period_year', filter.year)
      .eq('period_month', filter.month)
    if (filter.userIds) q = q.in('user_id', filter.userIds)
    const { data, error } = await q
    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return data ?? []
  },

  /** Upsert by (user_id, period_year, period_month) — Generate is idempotent. */
  async upsert(input: PayrollInsert): Promise<Payroll> {
    const { data, error } = await supabase
      .from('payrolls')
      .upsert({ ...input, updated_at: new Date().toISOString() }, {
        onConflict: 'user_id,period_year,period_month',
      })
      .select()
      .single()
    if (error || !data) throw new AppError('DB_ERROR', error?.message ?? 'Failed to save payroll', 500)
    return data
  },

  async updateStatus(id: string, status: 'draft' | 'finalised' | 'paid'): Promise<Payroll> {
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
    if (status === 'finalised') patch.finalised_at = new Date().toISOString()
    if (status === 'paid')      patch.paid_at      = new Date().toISOString()
    if (status === 'draft')     { patch.finalised_at = null; patch.paid_at = null }

    const { data, error } = await supabase
      .from('payrolls')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error || !data) throw new AppError('DB_ERROR', error?.message ?? 'Failed to update status', 500)
    return data
  },

  async deleteById(id: string): Promise<void> {
    const { error } = await supabase.from('payrolls').delete().eq('id', id)
    if (error) throw new AppError('DB_ERROR', error.message, 500)
  },

  // ── Compute helpers ───────────────────────────────────────────────────────

  async countApprovedTimecardsInRange(userId: string, start: string, end: string): Promise<number> {
    const { count, error } = await supabase
      .from('timecards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'approved')
      .gte('date', start)
      .lte('date', end)
    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return count ?? 0
  },

  async countApprovedLeavesInRange(userId: string, start: string, end: string): Promise<number> {
    const { count, error } = await supabase
      .from('leaves')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'approved')
      .gte('date', start)
      .lte('date', end)
    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return count ?? 0
  },

  async approvedOvertimeInRange(userId: string, start: string, end: string): Promise<{ hours: number; payout: number }> {
    const { data, error } = await supabase
      .from('overtime')
      .select('hours, payout')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .gte('date', start)
      .lte('date', end)
    if (error) throw new AppError('DB_ERROR', error.message, 500)
    const hours  = (data ?? []).reduce((s, r) => s + Number(r.hours  ?? 0), 0)
    const payout = (data ?? []).reduce((s, r) => s + Number(r.payout ?? 0), 0)
    return { hours, payout }
  },

  async getHolidayDatesInRange(start: string, end: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('holidays')
      .select('date')
      .gte('date', start)
      .lte('date', end)
    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return (data ?? []).map((r) => r.date)
  },

  async getRemainingLeaveBalance(userId: string): Promise<number> {
    const { data, error } = await supabase
      .from('leave_balance')
      .select('remaining')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return data?.remaining ?? 0
  },
}

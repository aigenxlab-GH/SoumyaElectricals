import { supabase } from '../../lib/supabase'
import { AppError } from '../../types'
import type { Overtime } from '@soumya/shared'

export const overtimeRepository = {
  async listByMonth(userId: string, year: number, month: number): Promise<Overtime[]> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('overtime')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return data ?? []
  },

  async findById(id: string): Promise<Overtime | null> {
    const { data } = await supabase.from('overtime').select('*').eq('id', id).single()
    return data
  },

  async insert(userId: string, date: string, hours: number, payout: number, workLog: string): Promise<Overtime> {
    const { data, error } = await supabase
      .from('overtime')
      .insert({ user_id: userId, date, hours, payout, work_log: workLog, status: 'applied' })
      .select()
      .single()

    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return data
  },

  async update(id: string, hours: number, payout: number, workLog: string): Promise<Overtime> {
    const { data, error } = await supabase
      .from('overtime')
      .update({ hours, payout, work_log: workLog })
      .eq('id', id)
      .eq('status', 'applied')
      .select()
      .single()

    if (error || !data) throw new AppError('NOT_FOUND', 'Overtime record not found or not editable', 404)
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('overtime').delete().eq('id', id).eq('status', 'applied')
    if (error) throw new AppError('DB_ERROR', error.message, 500)
  },

  async updateStatus(id: string, status: 'approved' | 'rejected'): Promise<Overtime> {
    const { data, error } = await supabase
      .from('overtime')
      .update({ status })
      .eq('id', id)
      .eq('status', 'applied')
      .select()
      .single()

    if (error || !data) throw new AppError('CONFLICT', 'Overtime record already processed or not found', 409)
    return data
  },
}

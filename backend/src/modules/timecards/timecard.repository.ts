import { supabase } from '../../lib/supabase'
import { AppError } from '../../types'
import type { Timecard } from '@soumya/shared'

export const timecardRepository = {
  async listByMonth(userId: string, year: number, month: number): Promise<Timecard[]> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`

    const { data, error } = await supabase
      .from('timecards')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return data ?? []
  },

  async findExistingDates(userId: string, dates: string[]): Promise<string[]> {
    const { data, error } = await supabase
      .from('timecards')
      .select('date')
      .eq('user_id', userId)
      .in('date', dates)

    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return (data ?? []).map((r) => r.date)
  },

  async insertOne(userId: string, date: string, workLog: string): Promise<Timecard> {
    const { data, error } = await supabase
      .from('timecards')
      .insert({ user_id: userId, date, work_log: workLog, status: 'applied' })
      .select()
      .single()

    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return data
  },

  async insertMany(userId: string, dates: string[], workLog: string): Promise<Timecard[]> {
    const rows = dates.map((date) => ({ user_id: userId, date, work_log: workLog, status: 'applied' }))
    const { data, error } = await supabase.from('timecards').insert(rows).select()
    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return data ?? []
  },

  async findById(id: string): Promise<Timecard | null> {
    const { data } = await supabase.from('timecards').select('*').eq('id', id).single()
    return data
  },

  async update(id: string, workLog: string): Promise<Timecard> {
    const { data, error } = await supabase
      .from('timecards')
      .update({ work_log: workLog })
      .eq('id', id)
      .eq('status', 'applied')
      .select()
      .single()

    if (error || !data) throw new AppError('NOT_FOUND', 'Timecard not found or not editable', 404)
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('timecards')
      .delete()
      .eq('id', id)
      .eq('status', 'applied')

    if (error) throw new AppError('DB_ERROR', error.message, 500)
  },

  async listByManagerScope(managerId: string, year: number, month: number): Promise<Timecard[]> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`

    const { data, error } = await supabase
      .from('timecards')
      .select('*, users!inner(manager_id)')
      .eq('users.manager_id', managerId)
      .gte('date', startDate)
      .lte('date', endDate)
      .eq('status', 'applied')

    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return data ?? []
  },

  async updateStatus(id: string, status: 'approved' | 'rejected'): Promise<Timecard> {
    const { data, error } = await supabase
      .from('timecards')
      .update({ status })
      .eq('id', id)
      .eq('status', 'applied')
      .select()
      .single()

    if (error || !data) throw new AppError('CONFLICT', 'Timecard already processed or not found', 409)
    return data
  },
}

import { supabase } from '../../lib/supabase'
import { AppError } from '../../types'
import type { Timecard, Leave, Overtime } from '@soumya/shared'

export const approvalRepository = {
  // ── Timecards ──────────────────────────────────────────────────────────────

  // Manager: sees applied timecards of employees directly under them
  async listPendingTimecardsByManager(managerId: string): Promise<Timecard[]> {
    const { data, error } = await supabase
      .from('timecards')
      .select('*, users!inner(manager_id, full_name, employee_id, role)')
      .eq('users.manager_id', managerId)
      .eq('status', 'applied')
      .order('date', { ascending: false })

    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return data ?? []
  },

  // Owner: sees applied timecards submitted by managers only
  async listAllPendingTimecards(): Promise<Timecard[]> {
    const { data, error } = await supabase
      .from('timecards')
      .select('*, users!inner(full_name, employee_id, manager_id, role)')
      .eq('users.role', 'manager')
      .eq('status', 'applied')
      .order('date', { ascending: false })

    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return data ?? []
  },

  async approveTimecard(id: string): Promise<Timecard> {
    const { data, error } = await supabase
      .from('timecards')
      .update({ status: 'approved' })
      .eq('id', id)
      .eq('status', 'applied')
      .select()
      .single()

    if (error || !data) throw new AppError('CONFLICT', 'Timecard already processed or not found', 409)
    return data
  },

  async rejectTimecard(id: string): Promise<Timecard> {
    const { data, error } = await supabase
      .from('timecards')
      .update({ status: 'rejected' })
      .eq('id', id)
      .eq('status', 'applied')
      .select()
      .single()

    if (error || !data) throw new AppError('CONFLICT', 'Timecard already processed or not found', 409)
    return data
  },

  // ── Leaves ─────────────────────────────────────────────────────────────────

  // Manager: sees applied leaves of employees directly under them
  async listPendingLeavesByManager(managerId: string): Promise<Leave[]> {
    const { data, error } = await supabase
      .from('leaves')
      .select('*, users!inner(manager_id, full_name, employee_id, role)')
      .eq('users.manager_id', managerId)
      .eq('status', 'applied')
      .order('date', { ascending: false })

    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return data ?? []
  },

  // Owner: sees applied leaves submitted by managers only
  async listAllPendingLeaves(): Promise<Leave[]> {
    const { data, error } = await supabase
      .from('leaves')
      .select('*, users!inner(full_name, employee_id, manager_id, role)')
      .eq('users.role', 'manager')
      .eq('status', 'applied')
      .order('date', { ascending: false })

    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return data ?? []
  },

  async approveLeave(id: string): Promise<Leave> {
    const { data, error } = await supabase.rpc('approve_leave', { p_leave_id: id })
    if (error || !data) throw new AppError('CONFLICT', 'Leave already processed or not found', 409)
    return data
  },

  async rejectLeave(id: string): Promise<Leave> {
    const { data, error } = await supabase.rpc('reject_leave', { p_leave_id: id })
    if (error || !data) throw new AppError('CONFLICT', 'Leave already processed or not found', 409)
    return data
  },

  // ── Overtime ───────────────────────────────────────────────────────────────

  // Manager: sees applied overtime of employees directly under them
  async listPendingOvertimesByManager(managerId: string): Promise<Overtime[]> {
    const { data, error } = await supabase
      .from('overtime')
      .select('*, users!inner(manager_id, full_name, employee_id, role)')
      .eq('users.manager_id', managerId)
      .eq('status', 'applied')
      .order('date', { ascending: false })

    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return data ?? []
  },

  // Owner: sees applied overtime submitted by managers only
  async listAllPendingOvertimes(): Promise<Overtime[]> {
    const { data, error } = await supabase
      .from('overtime')
      .select('*, users!inner(full_name, employee_id, manager_id, role)')
      .eq('users.role', 'manager')
      .eq('status', 'applied')
      .order('date', { ascending: false })

    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return data ?? []
  },

  async approveOvertime(id: string): Promise<Overtime> {
    const { data, error } = await supabase
      .from('overtime')
      .update({ status: 'approved' })
      .eq('id', id)
      .eq('status', 'applied')
      .select()
      .single()

    if (error || !data) throw new AppError('CONFLICT', 'Overtime already processed or not found', 409)
    return data
  },

  async rejectOvertime(id: string): Promise<Overtime> {
    const { data, error } = await supabase
      .from('overtime')
      .update({ status: 'rejected' })
      .eq('id', id)
      .eq('status', 'applied')
      .select()
      .single()

    if (error || !data) throw new AppError('CONFLICT', 'Overtime already processed or not found', 409)
    return data
  },
}

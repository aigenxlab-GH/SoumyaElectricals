import { supabase } from '../../lib/supabase'
import { AppError } from '../../types'
import type { User } from '@soumya/shared'

const USER_SAFE_FIELDS = 'id, employee_id, full_name, role, sex, date_of_birth, date_of_joining, manager_id, is_active, is_default_password, phone, address, email, created_at, updated_at' as const
const USER_FULL_FIELDS = 'id, employee_id, full_name, role, sex, date_of_birth, date_of_joining, aadhaar, manager_id, is_active, is_default_password, phone, address, email, created_at, updated_at' as const

export const userRepository = {
  async list(): Promise<Omit<User, 'aadhaar'>[]> {
    const { data, error } = await supabase
      .from('users')
      .select(USER_SAFE_FIELDS)
      .order('employee_id', { ascending: true })

    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return data ?? []
  },

  async findById(id: string, includeAadhaar = false): Promise<User | null> {
    if (includeAadhaar) {
      const { data } = await supabase.from('users').select(USER_FULL_FIELDS).eq('id', id).single()
      return data as unknown as User | null
    }
    const { data } = await supabase.from('users').select(USER_SAFE_FIELDS).eq('id', id).single()
    return data as unknown as User | null
  },

  async findByEmployeeId(employeeId: string): Promise<User | null> {
    const { data } = await supabase
      .from('users')
      .select(USER_SAFE_FIELDS)
      .eq('employee_id', employeeId)
      .single()
    return data
  },

  async findOwner(): Promise<User | null> {
    const { data } = await supabase
      .from('users')
      .select(USER_SAFE_FIELDS)
      .eq('role', 'owner')
      .limit(1)
      .maybeSingle()
    return data as unknown as User | null
  },

  async listReportableUsers(managerId: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select(USER_SAFE_FIELDS)
      .eq('manager_id', managerId)
      .eq('is_active', true)

    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return data ?? []
  },

  async getNextSequence(): Promise<number> {
    const { data, error } = await supabase.rpc('next_employee_id_seq')
    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return data
  },

  async create(payload: Record<string, unknown>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert(payload)
      .select(USER_SAFE_FIELDS)
      .single()

    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return data
  },

  async update(id: string, payload: Record<string, unknown>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', id)
      .select(USER_SAFE_FIELDS)
      .single()

    if (error || !data) throw new AppError('NOT_FOUND', 'User not found', 404)
    return data
  },

  async findByAadhaar(aadhaar: string): Promise<User | null> {
    const { data } = await supabase
      .from('users')
      .select(USER_FULL_FIELDS)
      .eq('aadhaar', aadhaar)
      .maybeSingle()
    return data as unknown as User | null
  },

  async countLinkedEmployees(managerId: string): Promise<number> {
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('manager_id', managerId)
      .eq('is_active', true)

    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return count ?? 0
  },
}

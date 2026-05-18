import { z } from 'zod'

// ── Salary ──────────────────────────────────────────────────────────────────

export const SetSalarySchema = z.object({
  monthly_salary: z.number().positive('Monthly salary must be greater than 0'),
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  note:           z.string().max(500).optional(),
})

export type SetSalaryDto = z.infer<typeof SetSalarySchema>

export interface SalaryEntry {
  id: string
  user_id: string
  monthly_salary: number
  effective_from: string
  note: string | null
  created_by: string | null
  created_at: string
}

// ── Payroll ─────────────────────────────────────────────────────────────────

export const GeneratePayrollSchema = z.object({
  user_id:      z.string().uuid(),
  period_year:  z.number().int().min(2026).max(2100),
  period_month: z.number().int().min(1).max(12),
})

export type GeneratePayrollDto = z.infer<typeof GeneratePayrollSchema>

export interface Payroll {
  id: string
  user_id: string
  period_year: number
  period_month: number
  period_start: string
  period_end: string
  monthly_salary: number
  full_period_working_days: number
  effective_working_days: number
  present_days: number
  paid_leave_days: number              // raw count of all approved leaves in period
  paid_leaves_within_balance: number   // leaves covered by available balance (paid)
  unpaid_leaves_lop: number            // leaves beyond available balance (LOP)
  unpaid_absent_days: number
  overtime_hours: number
  overtime_pay: number
  lop_from_writeoff_days: number
  total_lop_days: number
  per_day_rate: number
  earned_salary: number
  lop_deduction: number
  gross_pay: number
  net_pay: number
  employee_name_snapshot: string
  employee_id_snapshot: string
  employee_role_snapshot: string
  employee_join_date_snapshot: string
  generated_by: string | null
  generated_at: string
  updated_at: string
}

/** Per-user row for the Payroll list — includes the user's current salary so owners can spot mismatches */
export interface PayrollListRow {
  user_id: string
  employee_id: string
  full_name: string
  role: string
  current_salary: number | null     // null if no salary set
  payroll: Payroll | null           // null if not yet generated for the selected period
}

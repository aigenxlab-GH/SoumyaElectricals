import { supabase } from '../../lib/supabase'
import { payrollRepository } from './payroll.repository'
import { salaryRepository } from '../salary/salary.repository'
import { userRepository } from '../users/user.repository'
import { AppError } from '../../types'
import type { AuthUser } from '../../types'
import type {
  GeneratePayrollDto, Payroll, PayrollListRow, ProcessPayrollDto, User,
} from '@soumya/shared'

// ── Period helpers ──────────────────────────────────────────────────────────

function pad2(n: number): string { return String(n).padStart(2, '0') }

/** Cycle for "May 2026" is Apr 26 – May 25. Year/month always refer to cycle end. */
export function computePeriod(year: number, month: number): { start: string; end: string } {
  const endY  = year
  const endM  = month
  let startY = year
  let startM = month - 1
  if (startM === 0) { startM = 12; startY = year - 1 }
  return {
    start: `${startY}-${pad2(startM)}-26`,
    end:   `${endY}-${pad2(endM)}-25`,
  }
}

function dateRangeAsArray(start: string, end: string): string[] {
  const out: string[] = []
  const cur = new Date(start + 'T00:00:00')
  const stop = new Date(end + 'T00:00:00')
  while (cur <= stop) {
    out.push(cur.toISOString().split('T')[0])
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

/** Count working days (excl Sundays + holidays) in [start, end]. */
function workingDaysIn(start: string, end: string, holidays: Set<string>): number {
  let count = 0
  for (const d of dateRangeAsArray(start, end)) {
    const isSunday = new Date(d + 'T12:00:00').getDay() === 0
    if (!isSunday && !holidays.has(d)) count++
  }
  return count
}

/** Maximum of two YYYY-MM-DD strings. */
function maxDate(a: string, b: string): string { return a > b ? a : b }
/** Minimum of two YYYY-MM-DD strings. */
function minDate(a: string, b: string): string { return a < b ? a : b }

// ── Scope helpers ───────────────────────────────────────────────────────────

async function getScopeUserIds(actor: AuthUser): Promise<string[] | undefined> {
  if (actor.role === 'owner') return undefined
  if (actor.role === 'manager') {
    const team = await userRepository.listReportableUsers(actor.id)
    return team.map((u) => u.id)
  }
  return []
}

async function assertScopeAccess(actor: AuthUser, targetUserId: string): Promise<void> {
  if (actor.role === 'employee') {
    throw new AppError('FORBIDDEN', 'Employees cannot access payroll', 403)
  }
  const ids = await getScopeUserIds(actor)
  if (ids === undefined) return
  if (!ids.includes(targetUserId)) {
    throw new AppError('FORBIDDEN', 'You are not authorised to view this user\'s payroll', 403)
  }
}

// ── Service ─────────────────────────────────────────────────────────────────

export const payrollService = {
  async list(actor: AuthUser, year: number, month: number): Promise<PayrollListRow[]> {
    if (actor.role === 'employee') {
      throw new AppError('FORBIDDEN', 'Employees cannot access payroll', 403)
    }

    // Scope users
    let users: User[]
    if (actor.role === 'owner') {
      users = await userRepository.list()
    } else {
      users = await userRepository.listReportableUsers(actor.id)
    }
    // Active only — inactive users excluded per requirement (C-a)
    users = users.filter((u) => u.is_active && u.role !== 'owner' /* owners self-managed; never paid via payroll system here */)
    // Manager shouldn't see themselves either — only direct reports
    if (actor.role === 'manager') {
      users = users.filter((u) => u.id !== actor.id)
    }

    if (users.length === 0) return []

    const userIds = users.map((u) => u.id)
    const payrolls = await payrollRepository.listForPeriod({ year, month, userIds })
    const payrollByUser = Object.fromEntries(payrolls.map((p) => [p.user_id, p]))

    const { end: periodEnd } = computePeriod(year, month)
    const salaries = await salaryRepository.getSalariesAt(userIds, periodEnd)

    return users.map((u) => ({
      user_id:        u.id,
      employee_id:    u.employee_id,
      full_name:      u.full_name,
      role:           u.role,
      current_salary: salaries[u.id] ?? null,
      payroll:        payrollByUser[u.id] ?? null,
    }))
  },

  async detail(actor: AuthUser, id: string): Promise<Payroll> {
    const p = await payrollRepository.findById(id)
    if (!p) throw new AppError('NOT_FOUND', 'Payroll not found', 404)
    await assertScopeAccess(actor, p.user_id)
    return p
  },

  async generate(actor: AuthUser, dto: GeneratePayrollDto): Promise<Payroll> {
    await assertScopeAccess(actor, dto.user_id)

    const employee = await userRepository.findById(dto.user_id)
    if (!employee) throw new AppError('NOT_FOUND', 'Employee not found', 404)
    if (!employee.is_active) throw new AppError('INACTIVE_USER', 'Cannot generate payroll for an inactive user', 400)

    const { start, end } = computePeriod(dto.period_year, dto.period_month)

    // 1. Pull all the raw inputs in parallel
    const [holidayDates, presentDays, paidLeaveDays, ot, salary] = await Promise.all([
      payrollRepository.getHolidayDatesInRange(start, end),
      payrollRepository.countApprovedTimecardsInRange(dto.user_id, start, end),
      payrollRepository.countApprovedLeavesInRange(dto.user_id, start, end),
      payrollRepository.approvedOvertimeInRange(dto.user_id, start, end),
      salaryRepository.getSalaryAt(dto.user_id, end),
    ])

    if (salary === null || salary <= 0) {
      throw new AppError(
        'NO_SALARY_SET',
        `No salary set for ${employee.full_name} (${employee.employee_id}) effective on or before ${end}. Owner must set salary first.`,
        400
      )
    }
    const monthlySalary = Number(salary)
    const holidaySet    = new Set(holidayDates)

    // 2. Working days
    const fullWorkingDays = workingDaysIn(start, end, holidaySet)
    // Pro-rate by join date — employee may have joined mid-period.
    const effectiveStart   = maxDate(start, employee.date_of_joining)
    const effectiveEnd     = end
    const effectiveWorking = effectiveStart > effectiveEnd ? 0 : workingDaysIn(effectiveStart, effectiveEnd, holidaySet)

    const perDayRate = fullWorkingDays === 0 ? 0 : monthlySalary / fullWorkingDays

    const unpaidAbsent = Math.max(0, effectiveWorking - presentDays - paidLeaveDays)

    // 3. Loss-of-pay from V26 leave write-off — period-end snapshot.
    // Recompute leave_balance first so it reflects this user's current state, then read remaining.
    try { await supabase.rpc('recompute_leave_balance', { p_user_id: dto.user_id }) } catch { /* non-fatal */ }
    const remaining = await payrollRepository.getRemainingLeaveBalance(dto.user_id)
    const lopFromWriteoff = Math.max(0, -remaining)

    const totalLopDays = unpaidAbsent + lopFromWriteoff

    // 4. Money math
    const earnedSalary = round2(perDayRate * (presentDays + paidLeaveDays))
    const lopDeduction = round2(perDayRate * totalLopDays)
    const grossPay     = round2(earnedSalary + ot.payout)
    const netPay       = round2(grossPay - lopDeduction)

    // 5. Snapshot + upsert
    const result = await payrollRepository.upsert({
      user_id:                  dto.user_id,
      period_year:              dto.period_year,
      period_month:             dto.period_month,
      period_start:             start,
      period_end:               end,
      monthly_salary:           monthlySalary,
      full_period_working_days: fullWorkingDays,
      effective_working_days:   effectiveWorking,
      present_days:             presentDays,
      paid_leave_days:          paidLeaveDays,
      unpaid_absent_days:       unpaidAbsent,
      overtime_hours:           round2(ot.hours),
      overtime_pay:             round2(ot.payout),
      lop_from_writeoff_days:   lopFromWriteoff,
      total_lop_days:           totalLopDays,
      per_day_rate:             round2(perDayRate),
      earned_salary:            earnedSalary,
      lop_deduction:            lopDeduction,
      gross_pay:                grossPay,
      net_pay:                  netPay,
      employee_name_snapshot:       employee.full_name,
      employee_id_snapshot:         employee.employee_id,
      employee_role_snapshot:       employee.role,
      employee_join_date_snapshot:  employee.date_of_joining,
      status:                       'draft',
      generated_by:                 actor.id,
    } as unknown as Parameters<typeof payrollRepository.upsert>[0])

    return result
  },

  async process(actor: AuthUser, id: string, dto: ProcessPayrollDto): Promise<Payroll> {
    const existing = await payrollRepository.findById(id)
    if (!existing) throw new AppError('NOT_FOUND', 'Payroll not found', 404)
    await assertScopeAccess(actor, existing.user_id)

    const next: 'draft' | 'finalised' | 'paid' =
      dto.action === 'finalise'   ? 'finalised' :
      dto.action === 'mark-paid'  ? 'paid'      :
      'draft'

    return payrollRepository.updateStatus(id, next)
  },

  async remove(actor: AuthUser, id: string): Promise<void> {
    const existing = await payrollRepository.findById(id)
    if (!existing) throw new AppError('NOT_FOUND', 'Payroll not found', 404)
    await assertScopeAccess(actor, existing.user_id)
    if (existing.status !== 'draft') {
      throw new AppError('INVALID_STATUS', 'Only draft payrolls can be deleted', 400)
    }
    await payrollRepository.deleteById(id)
  },
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

import { supabase } from '../../lib/supabase'
import { payrollRepository } from './payroll.repository'
import { salaryRepository } from '../salary/salary.repository'
import { userRepository } from '../users/user.repository'
import { AppError } from '../../types'
import type { AuthUser } from '../../types'
import type {
  GeneratePayrollDto, Payroll, PayrollListRow, User,
} from '@soumya/shared'

// ── Period helpers ──────────────────────────────────────────────────────────

function pad2(n: number): string { return String(n).padStart(2, '0') }

/** Calendar month. "May 2026" → 2026-05-01 to 2026-05-31. */
export function computePeriod(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${pad2(month)}-01`
  // Last day of the month: day 0 of next month
  const lastDate = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const end = `${year}-${pad2(month)}-${pad2(lastDate)}`
  return { start, end }
}

function dateRangeAsArray(start: string, end: string): string[] {
  const out: string[] = []
  // Parse as UTC noon to avoid any local-timezone day-shift when converting back
  const cur = new Date(start + 'T12:00:00Z')
  const stop = new Date(end + 'T12:00:00Z')
  while (cur <= stop) {
    out.push(cur.toISOString().split('T')[0])
    cur.setUTCDate(cur.getUTCDate() + 1)
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

/** Read access — employee can view own payslip; manager/owner per scope. */
async function assertReadAccess(actor: AuthUser, targetUserId: string): Promise<void> {
  if (actor.role === 'employee') {
    if (actor.id !== targetUserId) {
      throw new AppError('FORBIDDEN', 'You can only view your own payroll', 403)
    }
    return
  }
  const ids = await getScopeUserIds(actor)
  if (ids === undefined) return
  if (!ids.includes(targetUserId)) {
    throw new AppError('FORBIDDEN', 'You are not authorised to view this user\'s payroll', 403)
  }
}

/** Write access — employees never; manager/owner per scope. */
async function assertWriteAccess(actor: AuthUser, targetUserId: string): Promise<void> {
  if (actor.role === 'employee') {
    throw new AppError('FORBIDDEN', 'Employees cannot modify payroll', 403)
  }
  const ids = await getScopeUserIds(actor)
  if (ids === undefined) return
  if (!ids.includes(targetUserId)) {
    throw new AppError('FORBIDDEN', 'You are not authorised to modify this user\'s payroll', 403)
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

  /** Look up the saved payroll for a specific (user, year, month). Returns null if not generated yet. */
  async lookup(actor: AuthUser, userId: string, year: number, month: number): Promise<Payroll | null> {
    await assertReadAccess(actor, userId)
    return payrollRepository.findByUserAndPeriod(userId, year, month)
  },

  /** Last N payrolls for a user, newest first. */
  async history(actor: AuthUser, userId: string, limit = 12): Promise<Payroll[]> {
    await assertReadAccess(actor, userId)
    return payrollRepository.listForUser(userId, limit)
  },

  async detail(actor: AuthUser, id: string): Promise<Payroll> {
    const p = await payrollRepository.findById(id)
    if (!p) throw new AppError('NOT_FOUND', 'Payroll not found', 404)
    await assertReadAccess(actor, p.user_id)
    return p
  },

  async generate(actor: AuthUser, dto: GeneratePayrollDto): Promise<Payroll> {
    await assertWriteAccess(actor, dto.user_id)

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

    // 3. LOP = approved leaves in this period that exceed the remaining annual credit.
    // Strategy: use total_credited (annual budget) vs cumulative approved leaves — this is
    // immune to V26 write-off timing which would incorrectly zero out LOP when payroll is
    // generated a month after the deficit period.
    try { await supabase.rpc('recompute_leave_balance', { p_user_id: dto.user_id }) } catch { /* non-fatal */ }

    const yearStart = `${dto.period_year}-01-01`
    const prevPeriodEnd = dto.period_month === 1 ? null : (() => {
      const pm      = dto.period_month - 1
      const lastDay = new Date(Date.UTC(dto.period_year, pm, 0)).getUTCDate()
      return `${dto.period_year}-${pad2(pm)}-${pad2(lastDay)}`
    })()

    const [leaveBalance, totalApprovedBeforePeriod] = await Promise.all([
      payrollRepository.getLeaveBalance(dto.user_id),
      prevPeriodEnd
        ? payrollRepository.countApprovedLeavesInRange(dto.user_id, yearStart, prevPeriodEnd)
        : Promise.resolve(0),
    ])

    // How many annual credits remain at the START of this period
    const availableForPeriod     = Math.max(0, leaveBalance.total_credited - totalApprovedBeforePeriod)
    const lopFromBalance         = Math.max(0, paidLeaveDays - availableForPeriod)
    const paidLeavesWithinBalance = paidLeaveDays - lopFromBalance
    const unpaidLeavesLop         = lopFromBalance
    const totalLopDays            = unpaidAbsent + lopFromBalance

    // 4. Money math
    //   Full monthly salary is paid for everything except LOP days.
    //   net = (monthly_salary − per_day × total_lop) + overtime
    //   Equivalent to current code's earned/lop/gross/net flow.
    const lopDeduction = round2(perDayRate * totalLopDays)
    const earnedSalary = round2(monthlySalary - lopDeduction)
    const grossPay     = round2(earnedSalary + ot.payout)
    const netPay       = grossPay

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
      present_days:                presentDays,
      paid_leave_days:             paidLeaveDays,
      paid_leaves_within_balance:  paidLeavesWithinBalance,
      unpaid_leaves_lop:           unpaidLeavesLop,
      unpaid_absent_days:          unpaidAbsent,
      overtime_hours:           round2(ot.hours),
      overtime_pay:             round2(ot.payout),
      lop_from_writeoff_days:   0,
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
      generated_by:                 actor.id,
    } as unknown as Parameters<typeof payrollRepository.upsert>[0])

    return result
  },

  /**
   * Generate payroll for every user in actor's scope for a given period.
   * Returns a per-user result list — does not fail the whole batch if one user errors.
   */
  async bulkGenerate(actor: AuthUser, year: number, month: number): Promise<{
    success: { user_id: string; employee_id: string; full_name: string; payroll_id: string }[]
    failed:  { user_id: string; employee_id: string; full_name: string; reason: string }[]
  }> {
    if (actor.role === 'employee') {
      throw new AppError('FORBIDDEN', 'Employees cannot generate payroll', 403)
    }
    // Build the same roster as list()
    let users: User[]
    if (actor.role === 'owner') {
      users = await userRepository.list()
    } else {
      users = await userRepository.listReportableUsers(actor.id)
    }
    users = users.filter((u) => u.is_active && u.role !== 'owner')
    if (actor.role === 'manager') users = users.filter((u) => u.id !== actor.id)

    const success: { user_id: string; employee_id: string; full_name: string; payroll_id: string }[] = []
    const failed:  { user_id: string; employee_id: string; full_name: string; reason: string }[] = []

    for (const u of users) {
      try {
        const p = await this.generate(actor, { user_id: u.id, period_year: year, period_month: month })
        success.push({ user_id: u.id, employee_id: u.employee_id, full_name: u.full_name, payroll_id: p.id })
      } catch (err) {
        const reason = err instanceof Error ? err.message : 'unknown error'
        failed.push({ user_id: u.id, employee_id: u.employee_id, full_name: u.full_name, reason })
      }
    }
    return { success, failed }
  },

  async remove(actor: AuthUser, id: string): Promise<void> {
    const existing = await payrollRepository.findById(id)
    if (!existing) throw new AppError('NOT_FOUND', 'Payroll not found', 404)
    await assertWriteAccess(actor, existing.user_id)
    await payrollRepository.deleteById(id)
  },
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LoadingSpinner } from '../../common/LoadingSpinner'
import { useUsers, useReportableUsers } from '../../hooks/useUsers'
import { useAuthStore } from '../../store/auth.store'
import { useCurrentSalary } from '../../hooks/useSalary'
import { usePayrollLookup, useGeneratePayroll } from '../../hooks/usePayrolls'
import { parseApiError } from '../../utils/api-error'
import type { PayrollStatus } from '@soumya/shared'

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MONTH_LONG  = ['January','February','March','April','May','June','July','August','September','October','November','December']
const fmtMoney = (n: number | null | undefined) =>
  n === null || n === undefined ? '—' : `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function StatusBadge({ status }: { status: PayrollStatus }) {
  const m: Record<PayrollStatus, string> = {
    draft:     'bg-gray-100 text-gray-700',
    finalised: 'bg-blue-100 text-blue-700',
    paid:      'bg-emerald-100 text-emerald-700',
  }
  return <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${m[status]}`}>{status}</span>
}

/** Build dropdown of last 12 months ending at today, format "May26". */
function buildMonthOptions(): { value: string; label: string; year: number; month: number }[] {
  const now = new Date()
  const opts: { value: string; label: string; year: number; month: number }[] = []
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = d.getMonth() + 1   // 1-12
    opts.push({
      value: `${y}-${m}`,
      label: `${MONTH_SHORT[m - 1]}${String(y).slice(2)}`,
      year:  y,
      month: m,
    })
  }
  return opts
}

export default function PayrollList() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const isOwner   = user?.role === 'owner'
  const isManager = user?.role === 'manager'

  // Roster — owner sees all active non-owner users; manager sees their team
  const { data: allUsers = [],   isLoading: loadingAll }   = useUsers({ enabled: isOwner })
  const { data: teamUsers = [],  isLoading: loadingTeam }  = useReportableUsers({ enabled: isManager })
  const employees = useMemo(() => {
    const list = isOwner ? allUsers : teamUsers
    return list.filter((u) => u.is_active && u.role !== 'owner')
  }, [isOwner, allUsers, teamUsers])

  const monthOptions = useMemo(buildMonthOptions, [])

  const [employeeId, setEmployeeId] = useState<string>('')
  const [monthKey, setMonthKey] = useState<string>(monthOptions[0].value)
  const [actionError, setActionError] = useState<string | null>(null)

  const selectedMonth = monthOptions.find((m) => m.value === monthKey) ?? monthOptions[0]
  const selectedEmployee = employees.find((u) => u.id === employeeId)

  const { data: salary } = useCurrentSalary(employeeId, { enabled: isOwner && !!employeeId })

  const lookup   = usePayrollLookup(employeeId, selectedMonth.year, selectedMonth.month, { enabled: !!employeeId })
  const generate = useGeneratePayroll()

  function handleGetPayroll() {
    if (!employeeId) return
    setActionError(null)
    generate.mutate(
      { user_id: employeeId, period_year: selectedMonth.year, period_month: selectedMonth.month },
      {
        onSuccess: (p) => navigate(`/payroll/${p.id}`),
        onError:   (err) => setActionError(parseApiError(err)),
      }
    )
  }

  const loadingRoster = (isOwner && loadingAll) || (isManager && loadingTeam)

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-xl font-semibold text-gray-900">Payroll</h1>

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <p className="text-sm text-gray-500">Pick an employee and a month, then click <strong>Get Payroll</strong>. The system will compute fresh values from attendance, leaves and overtime for that period.</p>

        {actionError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-center justify-between">
            <span>⚠ {actionError}</span>
            <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Employee */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">Employee</label>
            {loadingRoster ? <LoadingSpinner /> : (
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Select —</option>
                {employees.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.employee_id})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Month */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">Month</label>
            <select
              value={monthKey}
              onChange={(e) => setMonthKey(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {monthOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">{MONTH_LONG[selectedMonth.month - 1]} {selectedMonth.year} — 1st to last day</p>
          </div>
        </div>

        {/* Salary preview (owner only) */}
        {isOwner && selectedEmployee && (
          <div className="text-xs text-gray-500">
            Current salary for <strong className="text-gray-800">{selectedEmployee.full_name}</strong>: {fmtMoney(salary?.monthly_salary)}{' '}
            {(!salary || salary.monthly_salary === null) && (
              <Link to={`/owner/users/${selectedEmployee.id}/edit`} className="text-blue-600 hover:underline ml-1">Set salary →</Link>
            )}
          </div>
        )}

        {/* Existing payroll for this (user, month) */}
        {employeeId && lookup.data && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm flex items-center justify-between">
            <div>
              <div className="text-blue-900 font-medium">
                Payroll already exists for {selectedMonth.label}{'  '}
                <StatusBadge status={lookup.data.status} />
              </div>
              <p className="text-xs text-blue-700 mt-0.5">Net Pay: <strong>{fmtMoney(lookup.data.net_pay)}</strong></p>
            </div>
            <div className="flex gap-2">
              <Link to={`/payroll/${lookup.data.id}`} className="text-xs px-3 py-1.5 border border-blue-300 text-blue-700 rounded hover:bg-blue-100">View / PDF</Link>
              <button
                onClick={handleGetPayroll}
                disabled={generate.isPending}
                className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {generate.isPending ? 'Recomputing…' : 'Re-Compute'}
              </button>
            </div>
          </div>
        )}

        {/* Action */}
        <div className="flex justify-end">
          <button
            onClick={handleGetPayroll}
            disabled={!employeeId || generate.isPending}
            className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generate.isPending ? 'Generating…' : (lookup.data ? 'Re-Generate Payroll' : 'Get Payroll')}
          </button>
        </div>
      </div>
    </div>
  )
}

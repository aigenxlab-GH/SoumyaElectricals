import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LoadingSpinner } from '../../common/LoadingSpinner'
import { EmptyState } from '../../common/EmptyState'
import { ConfirmDialog } from '../../common/ConfirmDialog'
import { useUsers, useReportableUsers } from '../../hooks/useUsers'
import { useAuthStore } from '../../store/auth.store'
import { useCurrentSalary } from '../../hooks/useSalary'
import {
  usePayrollLookup, useGeneratePayroll, usePayrollHistory, useBulkGenerate,
} from '../../hooks/usePayrolls'
import { parseApiError } from '../../utils/api-error'
import { formatDate } from '../../utils/date-utils'
import type { Payroll, PayrollStatus } from '@soumya/shared'

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

function buildMonthOptions(): { value: string; label: string; year: number; month: number }[] {
  const now = new Date()
  const opts: { value: string; label: string; year: number; month: number }[] = []
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    opts.push({
      value: `${y}-${m}`,
      label: `${MONTH_SHORT[m - 1]}${String(y).slice(2)}`,
      year: y,
      month: m,
    })
  }
  return opts
}

function HistoryTable({ rows, isLoading }: { rows: Payroll[]; isLoading: boolean }) {
  if (isLoading) return <div className="py-6 text-center"><LoadingSpinner /></div>
  if (rows.length === 0) return <EmptyState message="No payslips generated yet." />
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {['Month','Period','Net Pay','Status','Generated','Action'].map((h) => (
              <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((p) => (
            <tr key={p.id} className="hover:bg-gray-50">
              <td className="px-4 py-2.5 font-medium text-gray-900">{MONTH_SHORT[p.period_month - 1]} {p.period_year}</td>
              <td className="px-4 py-2.5 text-xs text-gray-500">{formatDate(p.period_start)} – {formatDate(p.period_end)}</td>
              <td className="px-4 py-2.5 font-medium text-gray-800">{fmtMoney(p.net_pay)}</td>
              <td className="px-4 py-2.5"><StatusBadge status={p.status} /></td>
              <td className="px-4 py-2.5 text-xs text-gray-500">{formatDate(p.generated_at)}</td>
              <td className="px-4 py-2.5">
                <Link to={`/payroll/${p.id}`} className="text-xs text-blue-600 hover:underline">View / PDF</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function PayrollList() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const isOwner    = user?.role === 'owner'
  const isManager  = user?.role === 'manager'
  const isEmployee = user?.role === 'employee'

  // ── Employee branch: locked to self, show only history + month preview ──
  if (isEmployee && user) {
    return <EmployeeSelfView userId={user.id} />
  }

  // ── Owner / Manager branch ──
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
  const [showBulkConfirm, setShowBulkConfirm] = useState(false)
  const [bulkResult, setBulkResult] = useState<{
    success: { employee_id: string; full_name: string }[]
    failed:  { employee_id: string; full_name: string; reason: string }[]
  } | null>(null)

  const selectedMonth = monthOptions.find((m) => m.value === monthKey) ?? monthOptions[0]
  const selectedEmployee = employees.find((u) => u.id === employeeId)

  const { data: salary } = useCurrentSalary(employeeId, { enabled: isOwner && !!employeeId })
  const lookup    = usePayrollLookup(employeeId, selectedMonth.year, selectedMonth.month, { enabled: !!employeeId })
  const history   = usePayrollHistory(employeeId, 12, { enabled: !!employeeId })
  const generate  = useGeneratePayroll()
  const bulk      = useBulkGenerate()

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

  function handleBulkGenerate() {
    setActionError(null)
    setBulkResult(null)
    bulk.mutate(
      { year: selectedMonth.year, month: selectedMonth.month },
      {
        onSuccess: (r) => { setBulkResult(r); setShowBulkConfirm(false) },
        onError:   (err) => { setShowBulkConfirm(false); setActionError(parseApiError(err)) },
      }
    )
  }

  const loadingRoster = (isOwner && loadingAll) || (isManager && loadingTeam)

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Payroll</h1>
        <button
          onClick={() => setShowBulkConfirm(true)}
          disabled={bulk.isPending || employees.length === 0}
          className="px-4 py-2 text-sm border border-blue-300 text-blue-700 rounded-md hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {bulk.isPending ? 'Generating for all…' : `Generate for all (${employees.length})`}
        </button>
      </div>

      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-center justify-between">
          <span>⚠ {actionError}</span>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {bulkResult && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Bulk result — {selectedMonth.label}: <span className="text-emerald-700">{bulkResult.success.length} succeeded</span>
              {bulkResult.failed.length > 0 && <span className="text-red-700">, {bulkResult.failed.length} failed</span>}
            </h3>
            <button onClick={() => setBulkResult(null)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
          </div>
          {bulkResult.failed.length > 0 && (
            <div className="text-xs">
              <p className="font-medium text-gray-700 mb-1">Failed:</p>
              <ul className="space-y-1">
                {bulkResult.failed.map((f) => (
                  <li key={f.employee_id} className="text-red-700">
                    <strong>{f.full_name}</strong> ({f.employee_id}): {f.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Pick + Get Payroll */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <p className="text-sm text-gray-500">Pick an employee and a month, then click <strong>Get Payroll</strong>. The system computes fresh values from attendance, leaves and overtime.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <option key={u.id} value={u.id}>{u.full_name} ({u.employee_id})</option>
                ))}
              </select>
            )}
          </div>

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

        {isOwner && selectedEmployee && (
          <div className="text-xs text-gray-500">
            Current salary for <strong className="text-gray-800">{selectedEmployee.full_name}</strong>: {fmtMoney(salary?.monthly_salary)}{' '}
            {(!salary || salary.monthly_salary === null) && (
              <Link to={`/owner/users/${selectedEmployee.id}/edit`} className="text-blue-600 hover:underline ml-1">Set salary →</Link>
            )}
          </div>
        )}

        {employeeId && lookup.data && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm flex items-center justify-between">
            <div>
              <div className="text-blue-900 font-medium">
                Already exists for {selectedMonth.label}{'  '}<StatusBadge status={lookup.data.status} />
              </div>
              <p className="text-xs text-blue-700 mt-0.5">Net Pay: <strong>{fmtMoney(lookup.data.net_pay)}</strong></p>
            </div>
            <div className="flex gap-2">
              <Link to={`/payroll/${lookup.data.id}`} className="text-xs px-3 py-1.5 border border-blue-300 text-blue-700 rounded hover:bg-blue-100">View / PDF</Link>
              <button onClick={handleGetPayroll} disabled={generate.isPending}
                className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                {generate.isPending ? 'Recomputing…' : 'Re-Compute'}
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button onClick={handleGetPayroll} disabled={!employeeId || generate.isPending}
            className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {generate.isPending ? 'Generating…' : (lookup.data ? 'Re-Generate Payroll' : 'Get Payroll')}
          </button>
        </div>
      </div>

      {/* Employee history */}
      {employeeId && selectedEmployee && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">
              Payroll History — {selectedEmployee.full_name} <span className="text-xs text-gray-400 font-mono">({selectedEmployee.employee_id})</span>
            </h2>
            <span className="text-xs text-gray-400">last 12</span>
          </div>
          <HistoryTable rows={history.data ?? []} isLoading={history.isLoading} />
        </div>
      )}

      {showBulkConfirm && (
        <ConfirmDialog
          title={`Generate payroll for ${employees.length} employees?`}
          description={`This will compute payroll for ${selectedMonth.label} (${MONTH_LONG[selectedMonth.month - 1]} ${selectedMonth.year}) for every employee in your scope. Anyone without a salary set will be skipped with a clear error. Existing payrolls will be overwritten with fresh values.`}
          confirmLabel="Generate for all"
          isLoading={bulk.isPending}
          onConfirm={handleBulkGenerate}
          onCancel={() => setShowBulkConfirm(false)}
        />
      )}
    </div>
  )
}

// ── Employee self-view ─────────────────────────────────────────────────────

function EmployeeSelfView({ userId }: { userId: string }) {
  const monthOptions = useMemo(buildMonthOptions, [])
  const [monthKey, setMonthKey] = useState<string>(monthOptions[0].value)
  const selectedMonth = monthOptions.find((m) => m.value === monthKey) ?? monthOptions[0]

  const lookup  = usePayrollLookup(userId, selectedMonth.year, selectedMonth.month)
  const history = usePayrollHistory(userId, 12)

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-xl font-semibold text-gray-900">My Payslips</h1>

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">Month</label>
          <select
            value={monthKey}
            onChange={(e) => setMonthKey(e.target.value)}
            className="w-full max-w-xs border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {monthOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <p className="text-xs text-gray-400 mt-1">{MONTH_LONG[selectedMonth.month - 1]} {selectedMonth.year}</p>
        </div>

        {lookup.isLoading ? <LoadingSpinner /> : lookup.data ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm flex items-center justify-between">
            <div>
              <div className="text-blue-900 font-medium">
                Payslip ready for {selectedMonth.label}{'  '}<StatusBadge status={lookup.data.status} />
              </div>
              <p className="text-xs text-blue-700 mt-0.5">Net Pay: <strong>{fmtMoney(lookup.data.net_pay)}</strong></p>
            </div>
            <Link to={`/payroll/${lookup.data.id}`} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700">View / PDF</Link>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
            No payslip for {selectedMonth.label} yet. Your manager or the owner will generate it after the month closes.
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Past Payslips</h2>
          <span className="text-xs text-gray-400">last 12</span>
        </div>
        <HistoryTable rows={history.data ?? []} isLoading={history.isLoading} />
      </div>
    </div>
  )
}

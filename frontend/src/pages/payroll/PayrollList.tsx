import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LoadingSpinner } from '../../common/LoadingSpinner'
import { EmptyState } from '../../common/EmptyState'
import { usePayrollList, useGeneratePayroll } from '../../hooks/usePayrolls'
import { parseApiError } from '../../utils/api-error'
import type { PayrollListRow, PayrollStatus } from '@soumya/shared'

const fmtMoney = (n: number | null | undefined) =>
  n === null || n === undefined ? '—' : `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function StatusBadge({ status }: { status: PayrollStatus }) {
  const m: Record<PayrollStatus, string> = {
    draft:     'bg-gray-100 text-gray-700',
    finalised: 'bg-blue-100 text-blue-700',
    paid:      'bg-emerald-100 text-emerald-700',
  }
  return <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${m[status]}`}>{status}</span>
}

export default function PayrollList() {
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const { data: rows = [], isLoading, isFetching } = usePayrollList(year, month)
  const generate = useGeneratePayroll()

  // Period preview (Apr 26 – May 25)
  const { start, end } = useMemo(() => {
    const pad = (n: number) => String(n).padStart(2, '0')
    let sy = year, sm = month - 1
    if (sm === 0) { sm = 12; sy = year - 1 }
    return { start: `${sy}-${pad(sm)}-26`, end: `${year}-${pad(month)}-25` }
  }, [year, month])

  function handleGenerate(row: PayrollListRow) {
    setActionError(null)
    if (row.current_salary === null) {
      setActionError(`Cannot generate — ${row.full_name} (${row.employee_id}) has no salary set. Open Edit User to set it.`)
      return
    }
    setBusyId(row.user_id)
    generate.mutate(
      { user_id: row.user_id, period_year: year, period_month: month },
      {
        onSuccess: () => setBusyId(null),
        onError:   (err) => { setBusyId(null); setActionError(parseApiError(err)) },
      }
    )
  }

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Payroll</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Period:</span>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <span className="text-xs text-gray-400 ml-1">{start.slice(8)} {MONTHS[parseInt(start.slice(5,7))-1]} – {end.slice(8)} {MONTHS[month-1]}</span>
        </div>
      </div>

      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-center justify-between">
          <span>⚠ {actionError}</span>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {isLoading ? <div className="p-6"><LoadingSpinner /></div>
          : rows.length === 0 ? <EmptyState message="No users in your scope." />
          : (
          <div className={`overflow-x-auto transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Emp ID','Name','Role','Monthly Salary','Net Pay','Status','Action'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr key={row.user_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{row.employee_id}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{row.full_name}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{row.role}</td>
                    <td className="px-4 py-3 text-gray-800">{fmtMoney(row.current_salary)}</td>
                    <td className="px-4 py-3 text-gray-800 font-medium">{row.payroll ? fmtMoney(row.payroll.net_pay) : '—'}</td>
                    <td className="px-4 py-3">
                      {row.payroll ? <StatusBadge status={row.payroll.status} /> : <span className="text-xs text-gray-400">Not generated</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleGenerate(row)}
                          disabled={busyId === row.user_id || row.current_salary === null}
                          title={row.current_salary === null ? 'Set salary first via Edit User' : 'Compute / re-compute payroll'}
                          className="text-xs text-blue-600 hover:underline disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:no-underline">
                          {row.payroll ? (busyId === row.user_id ? 'Recomputing…' : 'Re-Generate') : (busyId === row.user_id ? 'Generating…' : 'Generate')}
                        </button>
                        {row.payroll && (
                          <Link to={`/payroll/${row.payroll.id}`} className="text-xs text-blue-600 hover:underline">View / PDF</Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Leave } from '@soumya/shared'
import { MonthPaginator } from '../../common/MonthPaginator'
import { LoadingSpinner } from '../../common/LoadingSpinner'
import { LeaveBalanceWidget } from '../../components/leaves/LeaveBalanceWidget'
import { LeaveList } from '../../components/leaves/LeaveList'
import { LeaveForm } from '../../components/leaves/LeaveForm'
import { BulkLeaveForm } from '../../components/leaves/BulkLeaveForm'
import { useLeaves, useLeaveBalance, useApplyLeave, useApplyBulkLeave, useUpdateLeave, useDeleteLeave } from '../../hooks/useLeaves'
import { useSystemConfig } from '../../hooks/useConfig'
import { useMyManager } from '../../hooks/useUsers'
import { parseApiError } from '../../utils/api-error'

type FormState = { mode: 'apply' } | { mode: 'bulk' } | { mode: 'edit'; leave: Leave } | null

function Modal({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  )
}

export default function MyLeave() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [form, setForm] = useState<FormState>(null)

  const { data: leaves = [], isLoading: leavesLoading } = useLeaves(year, month)
  const { data: balance, isLoading: balanceLoading } = useLeaveBalance()
  const { data: sysConfig } = useSystemConfig()
  const { data: myManager } = useMyManager()
  const monthlyCredit = sysConfig ? Math.floor(sysConfig.annual_leave_days / 12) : undefined
  const balanceRemaining = balance?.remaining ?? 0
  const holidayDates = sysConfig?.holidays?.map((h) => h.date) ?? []
  const approverName = myManager?.full_name ?? 'Owner'

  // Local filter state
  const [statusFilter, setStatusFilter] = useState<'all' | 'applied' | 'approved' | 'rejected'>('all')
  const [exactDate, setExactDate] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')

  const filterFn = useMemo(() => {
    return (lv: Leave) => {
      if (statusFilter !== 'all' && lv.status !== statusFilter) return false
      if (exactDate && lv.date !== exactDate) return false
      if (dateFrom && lv.date < dateFrom) return false
      if (dateTo   && lv.date > dateTo)   return false
      return true
    }
  }, [statusFilter, exactDate, dateFrom, dateTo])

  const applyLeave = useApplyLeave(year, month)
  const bulkLeave = useApplyBulkLeave(year, month)
  const updateLeave = useUpdateLeave(year, month)
  const deleteLeave = useDeleteLeave(year, month)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">My Leave</h1>
        <div className="flex items-center gap-2">
          <MonthPaginator year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m) }} />
          <button onClick={() => setForm({ mode: 'bulk' })} className="text-sm px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50">Bulk Apply</button>
          <button onClick={() => setForm({ mode: 'apply' })} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700">+ Apply</button>
        </div>
      </div>

      {balanceLoading ? <LoadingSpinner /> : balance && <LeaveBalanceWidget balance={balance} monthlyCredit={monthlyCredit} />}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 bg-white border border-slate-200 rounded-lg p-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="all">All</option>
            <option value="applied">Applied</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
          <input type="date" value={exactDate} onChange={(e) => setExactDate(e.target.value)}
            className="border border-slate-300 rounded-md px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
          <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)}
            className="border border-slate-300 rounded-md px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
          <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)}
            className="border border-slate-300 rounded-md px-2 py-1.5 text-sm" />
        </div>
        {(statusFilter !== 'all' || exactDate || dateFrom || dateTo) && (
          <button onClick={() => { setStatusFilter('all'); setExactDate(''); setDateFrom(''); setDateTo('') }}
            className="text-xs text-slate-500 hover:text-slate-700 underline">Clear filters</button>
        )}
      </div>

      {leavesLoading ? <LoadingSpinner /> : (
        <LeaveList
          leaves={leaves}
          onEdit={(lv) => setForm({ mode: 'edit', leave: lv })}
          onDelete={(id) => deleteLeave.mutate(id)}
          isDeleting={deleteLeave.isPending}
          approverName={approverName}
          filterFn={filterFn}
        />
      )}

      {form?.mode === 'apply' && (
        <Modal title="Apply Leave">
          <LeaveForm mode="apply" balanceRemaining={balanceRemaining} isPending={applyLeave.isPending} serverError={parseApiError(applyLeave.error)}
            onSubmit={(dto) => applyLeave.mutate(dto, { onSuccess: () => setForm(null) })}
            onCancel={() => setForm(null)} />
        </Modal>
      )}
      {form?.mode === 'bulk' && (
        <Modal title="Bulk Apply Leave">
          <BulkLeaveForm balanceRemaining={balanceRemaining} holidayDates={holidayDates} isPending={bulkLeave.isPending} serverError={parseApiError(bulkLeave.error)}
            onSubmit={(dto) => bulkLeave.mutate(dto, { onSuccess: () => setForm(null) })}
            onCancel={() => setForm(null)} />
        </Modal>
      )}
      {form?.mode === 'edit' && (
        <Modal title="Edit Leave">
          <LeaveForm mode="edit" editing={form.leave} isPending={updateLeave.isPending} serverError={parseApiError(updateLeave.error)}
            onSubmit={(dto) => updateLeave.mutate({ id: form.leave.id, dto }, { onSuccess: () => setForm(null) })}
            onCancel={() => setForm(null)} />
        </Modal>
      )}
    </div>
  )
}

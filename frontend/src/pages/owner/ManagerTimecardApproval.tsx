import { useMemo, useState } from 'react'
import { LoadingSpinner } from '../../common/LoadingSpinner'
import { FilterBar } from '../../common/FilterBar'
import type { ActiveFilter } from '../../common/FilterBar'
import { ApprovalTable } from '../../components/approvals/ApprovalTable'
import { OvertimeApprovalSection } from '../../components/approvals/OvertimeApprovalSection'
import {
  useTimecardApprovals,
  useProcessTimecardApproval,
  useBulkProcessTimecardApproval,
  useOvertimeApprovals,
  useProcessOvertimeApproval,
  useBulkProcessOvertimeApproval,
} from '../../hooks/useApprovals'
import { useUsers } from '../../hooks/useUsers'
import type { ApprovalTimecard, ApprovalOvertime } from '../../types/approvals'

export default function ManagerTimecardApproval() {
  const { data = [], isLoading } = useTimecardApprovals()
  const { data: overtimes = [], isLoading: otLoading } = useOvertimeApprovals()
  const { data: users = [] } = useUsers()
  const { mutate: process, isPending } = useProcessTimecardApproval()
  const { mutate: bulkProcess, isPending: isBulkPending } = useBulkProcessTimecardApproval()
  const { mutate: processOt, isPending: isOtPending } = useProcessOvertimeApproval()
  const { mutate: bulkProcessOt, isPending: isBulkOtPending } = useBulkProcessOvertimeApproval()
  const [activeFilter, setActiveFilter] = useState<ActiveFilter | null>(null)

  const ownerName = useMemo(() => users.find((u) => u.role === 'owner')?.full_name, [users])
  const managerById = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u.full_name])),
    [users],
  )

  const filtered = useMemo(() => {
    let list = data as ApprovalTimecard[]
    if (!activeFilter) return list
    const { criteria, value, from, to } = activeFilter
    return list.filter((item) => {
      if (criteria === 'emp_id') return item.users?.employee_id?.toLowerCase().includes(value.toLowerCase())
      if (criteria === 'name') return item.users?.full_name?.toLowerCase().includes(value.toLowerCase())
      if (criteria === 'role') return !value || item.users?.role === value
      if (criteria === 'date') return item.date === value
      if (criteria === 'date_range') return (!from || item.date >= from) && (!to || item.date <= to)
      return true
    })
  }, [data, activeFilter])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <h1 className="text-xl font-semibold text-gray-900">All Timecard Approvals</h1>
        {data.length > 0 && (
          <span className="text-sm text-slate-500">
            {filtered.length !== data.length ? `${filtered.length} of ${data.length}` : `${data.length}`} pending
          </span>
        )}
      </div>

      <FilterBar onFilter={setActiveFilter} onClear={() => setActiveFilter(null)} showRole />

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6"><LoadingSpinner /></div>
        ) : (
          <ApprovalTable
            type="timecard"
            items={filtered}
            onProcess={(id, action) => process({ id, action })}
            onBulkProcess={(ids, action) => bulkProcess({ ids, action })}
            isPending={isPending}
            isBulkPending={isBulkPending}
            managerById={managerById}
            ownerName={ownerName}
          />
        )}
      </div>

      {/* ── Overtime Approvals ── */}
      <div className="relative py-6">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t-4 border-slate-300 rounded-full" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-slate-100 px-4 text-sm font-semibold text-slate-500 uppercase tracking-widest">
            Overtime Approvals
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <h2 className="text-base font-semibold text-gray-900">Pending Overtime</h2>
        {overtimes.length > 0 && (
          <span className="text-sm text-slate-500">{overtimes.length} pending</span>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {otLoading ? (
          <div className="p-6"><LoadingSpinner /></div>
        ) : (
          <OvertimeApprovalSection
            items={overtimes as ApprovalOvertime[]}
            onProcess={(id, action) => processOt({ id, action })}
            onBulkProcess={(ids, action) => bulkProcessOt({ ids, action })}
            isPending={isOtPending}
            isBulkPending={isBulkOtPending}
            managerById={managerById}
            ownerName={ownerName}
          />
        )}
      </div>
    </div>
  )
}

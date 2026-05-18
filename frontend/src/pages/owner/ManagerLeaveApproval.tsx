import { useMemo, useState } from 'react'
import { LoadingSpinner } from '../../common/LoadingSpinner'
import { FilterBar } from '../../common/FilterBar'
import type { ActiveFilter } from '../../common/FilterBar'
import { ApprovalTable } from '../../components/approvals/ApprovalTable'
import {
  useLeaveApprovals,
  useProcessLeaveApproval,
  useBulkProcessLeaveApproval,
} from '../../hooks/useApprovals'
import { useUsers } from '../../hooks/useUsers'
import type { ApprovalLeave } from '../../types/approvals'

export default function ManagerLeaveApproval() {
  const { data = [], isLoading } = useLeaveApprovals()
  const { data: users = [] } = useUsers()
  const { mutate: process, isPending } = useProcessLeaveApproval()
  const { mutate: bulkProcess, isPending: isBulkPending } = useBulkProcessLeaveApproval()
  const [activeFilter, setActiveFilter] = useState<ActiveFilter | null>(null)

  const ownerName = useMemo(() => users.find((u) => u.role === 'owner')?.full_name, [users])
  const managerById = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u.full_name])),
    [users],
  )

  const filtered = useMemo(() => {
    let list = data as ApprovalLeave[]
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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">All Leave Approvals</h1>
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
            type="leave"
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
    </div>
  )
}

import { useState, useMemo } from 'react'
import type { Timecard } from '@soumya/shared'
import { StatusBadge } from '../ui/StatusBadge'
import { ConfirmDialog } from '../../common/ConfirmDialog'
import { EmptyState } from '../../common/EmptyState'
import { Paginator } from '../../common/Paginator'
import { usePagination } from '../../common/usePagination'
import { useSorting } from '../../common/useSorting'
import { SortableHeader } from '../../common/SortableHeader'
import { formatDate } from '../../utils/date-utils'

interface Props {
  timecards: Timecard[]
  onEdit: (tc: Timecard) => void
  onDelete: (id: string) => void
  isDeleting: boolean
  approverName?: string   // name of the person who approves (manager name or "Owner")
  approverRole?: string   // label e.g. "Manager" or "Owner"
  /** Optional client-side filter */
  filterFn?: (tc: Timecard) => boolean
}

export function TimecardList({ timecards, onEdit, onDelete, isDeleting, approverName, approverRole, filterFn }: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const filtered = useMemo(() =>
    filterFn ? timecards.filter(filterFn) : timecards,
    [timecards, filterFn],
  )

  const { sorted, sort, toggle } = useSorting(filtered, 'date', 'desc')
  const { paged, page, totalPages, pageSize, total, rangeStart, rangeEnd, setPage, setPageSize } =
    usePagination(sorted)

  if (timecards.length === 0) return <EmptyState message="No timecards for this month." />

  function approvedByLabel(tc: Timecard) {
    if (tc.status === 'applied') return <span className="text-xs text-amber-600 font-medium">Approval required</span>
    if (approverName) return <span className="text-xs text-slate-600">{approverName} <span className="text-slate-400">({approverRole ?? 'Approver'})</span></span>
    return <span className="text-xs text-slate-400">—</span>
  }

  const thCls = 'text-left'

  return (
    <>
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <SortableHeader label="Date" sortKey="date" activeKey={sort.key} dir={sort.dir} onToggle={toggle} className={thCls} />
              <SortableHeader label="Work Log" sortKey="work_log" activeKey={sort.key} dir={sort.dir} onToggle={toggle} className={thCls} />
              <SortableHeader label="Status" sortKey="status" activeKey={sort.key} dir={sort.dir} onToggle={toggle} className={thCls} />
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Approved By</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {paged.map((tc) => (
              <tr key={tc.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-slate-900 whitespace-nowrap font-medium">{formatDate(tc.date)}</td>
                <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{tc.work_log}</td>
                <td className="px-4 py-3"><StatusBadge status={tc.status} /></td>
                <td className="px-4 py-3">{approvedByLabel(tc)}</td>
                <td className="px-4 py-3 text-right space-x-3">
                  {tc.status === 'applied' && (
                    <>
                      <button onClick={() => onEdit(tc)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                      <button onClick={() => setConfirmId(tc.id)} className="text-xs text-red-600 hover:text-red-800 font-medium">Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Paginator
          page={page} totalPages={totalPages} pageSize={pageSize}
          total={total} rangeStart={rangeStart} rangeEnd={rangeEnd}
          onPageChange={setPage} onPageSizeChange={setPageSize}
        />
      </div>
      {confirmId && (
        <ConfirmDialog
          title="Delete Timecard"
          description="This timecard will be permanently deleted."
          confirmLabel="Delete"
          isLoading={isDeleting}
          onConfirm={() => { onDelete(confirmId); setConfirmId(null) }}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </>
  )
}

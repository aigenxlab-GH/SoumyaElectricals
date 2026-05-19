import { useState } from 'react'
import type { Overtime } from '@soumya/shared'
import { StatusBadge } from '../ui/StatusBadge'
import { ConfirmDialog } from '../../common/ConfirmDialog'
import { EmptyState } from '../../common/EmptyState'
import { Paginator } from '../../common/Paginator'
import { usePagination } from '../../common/usePagination'
import { useSorting } from '../../common/useSorting'
import { SortableHeader } from '../../common/SortableHeader'
import { formatDate } from '../../utils/date-utils'

interface Props {
  entries: Overtime[]
  onEdit: (entry: Overtime) => void
  onDelete: (id: string) => void
  isDeleting: boolean
  hidePayout?: boolean   // true for employee/manager applicant view
  filterFn?: (entry: Overtime) => boolean
}

export function OvertimeList({ entries, onEdit, onDelete, isDeleting, hidePayout = false, filterFn }: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const visible = filterFn ? entries.filter(filterFn) : entries
  const { sorted, sort, toggle } = useSorting(visible, 'date', 'desc')
  const { paged, page, totalPages, pageSize, total, rangeStart, rangeEnd, setPage, setPageSize } =
    usePagination(sorted)

  if (visible.length === 0) return <EmptyState message="No overtime entries match the current filters." />

  const thCls = 'text-left'

  return (
    <>
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <SortableHeader label="Date" sortKey="date" activeKey={sort.key} dir={sort.dir} onToggle={toggle} className={thCls} />
              <SortableHeader label="Hours" sortKey="hours" activeKey={sort.key} dir={sort.dir} onToggle={toggle} className={thCls} />
              {!hidePayout && (
                <SortableHeader label="Payout (₹)" sortKey="payout" activeKey={sort.key} dir={sort.dir} onToggle={toggle} className={`${thCls} hidden sm:table-cell`} />
              )}
              <SortableHeader label="Work Log" sortKey="work_log" activeKey={sort.key} dir={sort.dir} onToggle={toggle} className={`${thCls} hidden sm:table-cell`} />
              <SortableHeader label="Status" sortKey="status" activeKey={sort.key} dir={sort.dir} onToggle={toggle} className={thCls} />
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {paged.map((ot) => (
              <tr key={ot.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-slate-900 whitespace-nowrap font-medium">{formatDate(ot.date)}</td>
                <td className="px-4 py-3 text-slate-900">{ot.hours}h</td>
                {!hidePayout && (
                  <td className="px-4 py-3 text-slate-900 font-medium hidden sm:table-cell">₹{Number(ot.payout).toLocaleString('en-IN')}</td>
                )}
                <td className="px-4 py-3 text-slate-600 max-w-xs truncate hidden sm:table-cell">{ot.work_log}</td>
                <td className="px-4 py-3"><StatusBadge status={ot.status} /></td>
                <td className="px-4 py-3 text-right space-x-3">
                  {ot.status === 'applied' && (
                    <>
                      <button onClick={() => onEdit(ot)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                      <button onClick={() => setConfirmId(ot.id)} className="text-xs text-red-600 hover:text-red-800 font-medium">Delete</button>
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
          title="Delete Overtime Entry"
          description="This overtime entry will be permanently deleted."
          confirmLabel="Delete"
          isLoading={isDeleting}
          onConfirm={() => { onDelete(confirmId); setConfirmId(null) }}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </>
  )
}

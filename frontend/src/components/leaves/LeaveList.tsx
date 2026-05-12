import { useState } from 'react'
import type { Leave } from '@soumya/shared'
import { StatusBadge } from '../ui/StatusBadge'
import { ConfirmDialog } from '../../common/ConfirmDialog'
import { EmptyState } from '../../common/EmptyState'
import { Paginator } from '../../common/Paginator'
import { usePagination } from '../../common/usePagination'
import { useSorting } from '../../common/useSorting'
import { SortableHeader } from '../../common/SortableHeader'
import { formatDate } from '../../utils/date-utils'

interface Props {
  leaves: Leave[]
  onEdit: (leave: Leave) => void
  onDelete: (id: string) => void
  isDeleting: boolean
}

export function LeaveList({ leaves, onEdit, onDelete, isDeleting }: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const { sorted, sort, toggle } = useSorting(leaves, 'date', 'desc')
  const { paged, page, totalPages, pageSize, total, rangeStart, rangeEnd, setPage, setPageSize } =
    usePagination(sorted)

  if (leaves.length === 0) return <EmptyState message="No leaves for this month." />

  const thCls = 'text-left'

  return (
    <>
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <SortableHeader label="Date" sortKey="date" activeKey={sort.key} dir={sort.dir} onToggle={toggle} className={thCls} />
              <SortableHeader label="Reason" sortKey="reason" activeKey={sort.key} dir={sort.dir} onToggle={toggle} className={thCls} />
              <SortableHeader label="Status" sortKey="status" activeKey={sort.key} dir={sort.dir} onToggle={toggle} className={thCls} />
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {paged.map((lv) => (
              <tr key={lv.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-slate-900 whitespace-nowrap font-medium">{formatDate(lv.date)}</td>
                <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{lv.reason}</td>
                <td className="px-4 py-3"><StatusBadge status={lv.status} /></td>
                <td className="px-4 py-3 text-right space-x-3">
                  {lv.status === 'applied' && (
                    <>
                      <button onClick={() => onEdit(lv)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                      <button onClick={() => setConfirmId(lv.id)} className="text-xs text-red-600 hover:text-red-800 font-medium">Delete</button>
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
          title="Cancel Leave"
          description="This leave will be cancelled and your balance will be restored."
          confirmLabel="Cancel Leave"
          isLoading={isDeleting}
          onConfirm={() => { onDelete(confirmId); setConfirmId(null) }}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </>
  )
}

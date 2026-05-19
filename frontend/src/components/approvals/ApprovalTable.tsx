import { useMemo, useState } from 'react'
import { ConfirmDialog } from '../../common/ConfirmDialog'
import { EmptyState } from '../../common/EmptyState'
import { Paginator } from '../../common/Paginator'
import { usePagination } from '../../common/usePagination'
import { SortableHeader } from '../../common/SortableHeader'
import type { SortDir } from '../../common/useSorting'
import type { ApprovalTimecard, ApprovalLeave } from '../../types/approvals'
import { formatDate } from '../../utils/date-utils'

type ApprovalItem = ApprovalTimecard | ApprovalLeave
type ConfirmState =
  | { kind: 'single'; id: string; action: 'approve' | 'reject' }
  | { kind: 'bulk'; ids: string[]; action: 'approve' | 'reject' }
  | null

interface Props {
  type: 'timecard' | 'leave'
  items: ApprovalItem[]          // already filtered by parent
  onProcess: (id: string, action: 'approve' | 'reject') => void
  onBulkProcess: (ids: string[], action: 'approve' | 'reject') => void
  isPending: boolean
  isBulkPending: boolean
  showManager?: boolean
  managerById?: Record<string, string>
  ownerName?: string
}

export function ApprovalTable({
  type, items, onProcess, onBulkProcess, isPending, isBulkPending,
  showManager = false, managerById = {}, ownerName,
}: Props) {
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState<{ key: string; dir: SortDir }>({ key: 'date', dir: 'desc' })

  function toggleSort(key: string) {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' },
    )
  }

  function getSortValue(item: ApprovalItem, key: string): string | number {
    switch (key) {
      case 'employee_id': return item.users?.employee_id ?? ''
      case 'full_name':   return item.users?.full_name ?? ''
      case 'role':        return item.users?.role ?? ''
      case 'manager':
        return item.users?.manager_id
          ? (managerById[item.users.manager_id] ?? '')
          : (ownerName ?? '')
      case 'date': return item.date
      default:     return ''
    }
  }

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const av = getSortValue(a, sort.key)
      const bv = getSortValue(b, sort.key)
      if (av === bv) return 0
      const cmp = av < bv ? -1 : 1
      return sort.dir === 'asc' ? cmp : -cmp
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, sort.key, sort.dir, managerById, ownerName])

  const { paged, page, totalPages, pageSize, total, rangeStart, rangeEnd, setPage, setPageSize } =
    usePagination(sortedItems)

  // Derive visible selection from the current PAGE (not all items)
  const visibleIds = useMemo(() => new Set(paged.map((i) => i.id)), [paged])
  const visibleSelected = useMemo(
    () => paged.filter((i) => selected.has(i.id)).map((i) => i.id),
    [paged, selected],
  )

  const allSelected = paged.length > 0 && visibleSelected.length === paged.length
  const someSelected = visibleSelected.length > 0 && !allSelected
  const isProcessing = isPending || isBulkPending

  function toggleAll() {
    if (allSelected) {
      // deselect only the currently visible ones; leave any hidden selection untouched
      setSelected((prev) => {
        const next = new Set(prev)
        visibleIds.forEach((id) => next.delete(id))
        return next
      })
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        visibleIds.forEach((id) => next.add(id))
        return next
      })
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleConfirm() {
    if (!confirm) return
    if (confirm.kind === 'single') {
      onProcess(confirm.id, confirm.action)
    } else {
      // Only process IDs that are currently visible — respects active filter
      onBulkProcess(confirm.ids, confirm.action)
      setSelected((prev) => {
        const next = new Set(prev)
        confirm.ids.forEach((id) => next.delete(id))
        return next
      })
    }
    setConfirm(null)
  }

  if (!items.length) {
    return <EmptyState message={`No pending ${type === 'timecard' ? 'timecards' : 'leaves'}.`} />
  }

  const noun = type === 'timecard' ? 'timecard' : 'leave'

  return (
    <>
      {/* ── Bulk action bar — shows only when visible rows are checked ── */}
      {visibleSelected.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50 border-b border-blue-200">
          <span className="text-sm font-semibold text-blue-700">
            {visibleSelected.length} {visibleSelected.length === 1 ? 'row' : 'rows'} selected
            {visibleSelected.length < items.length && (
              <span className="text-blue-500 font-normal ml-1">(filtered view)</span>
            )}
          </span>
          <div className="flex items-center gap-2">
            {/* Select all visible shortcut */}
            {!allSelected && (
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs text-blue-600 hover:underline mr-1"
              >
                Select all {items.length}
              </button>
            )}
            <button
              onClick={() =>
                setConfirm({ kind: 'bulk', ids: visibleSelected, action: 'approve' })
              }
              disabled={isProcessing}
              className="px-4 py-1.5 text-xs font-semibold text-white rounded-lg
                bg-gradient-to-br from-green-500 to-green-700
                shadow-[0_2px_4px_rgba(22,163,74,0.4)]
                hover:from-green-600 hover:to-green-800 hover:-translate-y-px
                transition-all duration-150 disabled:opacity-50"
            >
              Bulk Approve ({visibleSelected.length})
            </button>
            <button
              onClick={() =>
                setConfirm({ kind: 'bulk', ids: visibleSelected, action: 'reject' })
              }
              disabled={isProcessing}
              className="px-4 py-1.5 text-xs font-semibold text-white rounded-lg
                bg-gradient-to-br from-red-500 to-red-700
                shadow-[0_2px_4px_rgba(220,38,38,0.4)]
                hover:from-red-600 hover:to-red-800 hover:-translate-y-px
                transition-all duration-150 disabled:opacity-50"
            >
              Bulk Reject ({visibleSelected.length})
            </button>
            <button
              onClick={() =>
                setSelected((prev) => {
                  const next = new Set(prev)
                  visibleIds.forEach((id) => next.delete(id))
                  return next
                })
              }
              className="px-3 py-1.5 text-xs font-medium text-slate-600 rounded-lg
                border border-slate-300 hover:bg-slate-100 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected }}
                  onChange={toggleAll}
                  title={allSelected ? 'Deselect all' : 'Select all visible'}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 cursor-pointer
                    focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                />
              </th>
              <SortableHeader label="Emp ID"  sortKey="employee_id" activeKey={sort.key} dir={sort.dir} onToggle={toggleSort} className="text-left hidden sm:table-cell" />
              <SortableHeader label="Name"    sortKey="full_name"   activeKey={sort.key} dir={sort.dir} onToggle={toggleSort} className="text-left" />
              <SortableHeader label="Role"    sortKey="role"        activeKey={sort.key} dir={sort.dir} onToggle={toggleSort} className="text-left hidden sm:table-cell" />
              {showManager && (
                <SortableHeader label="Manager" sortKey="manager" activeKey={sort.key} dir={sort.dir} onToggle={toggleSort} className="text-left hidden sm:table-cell" />
              )}
              <SortableHeader label="Date"   sortKey="date"        activeKey={sort.key} dir={sort.dir} onToggle={toggleSort} className="text-left" />
              <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider text-xs hidden sm:table-cell">
                {type === 'timecard' ? 'Work Log' : 'Reason'}
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 uppercase tracking-wider text-xs">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {paged.map((item) => {
              const isChecked = selected.has(item.id)
              const detail = type === 'timecard'
                ? (item as ApprovalTimecard).work_log
                : (item as ApprovalLeave).reason
              return (
                <tr
                  key={item.id}
                  onClick={() => toggleOne(item.id)}
                  className={`cursor-pointer transition-colors ${
                    isChecked ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleOne(item.id)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 cursor-pointer
                        focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                    />
                  </td>
                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {item.users?.employee_id ?? item.user_id.slice(0, 8)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-slate-900">
                    {item.users?.full_name ?? '—'}
                  </td>
                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    {item.users?.role ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold
                        ${item.users.role === 'manager'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-600'}`}>
                        {item.users.role.charAt(0).toUpperCase() + item.users.role.slice(1)}
                      </span>
                    ) : '—'}
                  </td>
                  {showManager && (
                    <td className="px-4 py-3.5 text-slate-600 hidden sm:table-cell">
                      {item.users?.manager_id
                        ? (managerById[item.users.manager_id] ?? '—')
                        : (ownerName ?? '—')}
                    </td>
                  )}
                  <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap font-medium">
                    {formatDate(item.date)}
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 max-w-xs truncate hidden sm:table-cell" title={detail}>
                    {detail}
                  </td>
                  <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setConfirm({ kind: 'single', id: item.id, action: 'approve' })}
                        disabled={isProcessing}
                        className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg
                          bg-gradient-to-br from-green-500 to-green-700
                          shadow-[0_2px_4px_rgba(22,163,74,0.4)]
                          hover:from-green-600 hover:to-green-800 hover:-translate-y-px
                          transition-all duration-150 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setConfirm({ kind: 'single', id: item.id, action: 'reject' })}
                        disabled={isProcessing}
                        className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg
                          bg-gradient-to-br from-red-500 to-red-700
                          shadow-[0_2px_4px_rgba(220,38,38,0.4)]
                          hover:from-red-600 hover:to-red-800 hover:-translate-y-px
                          transition-all duration-150 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Paginator
        page={page} totalPages={totalPages} pageSize={pageSize}
        total={total} rangeStart={rangeStart} rangeEnd={rangeEnd}
        onPageChange={setPage} onPageSizeChange={setPageSize}
      />

      {confirm && (
        <ConfirmDialog
          title={
            confirm.kind === 'bulk'
              ? `Bulk ${confirm.action === 'approve' ? 'Approve' : 'Reject'} ${confirm.ids.length} ${noun}s?`
              : confirm.action === 'approve' ? 'Approve?' : 'Reject?'
          }
          description={
            confirm.kind === 'bulk'
              ? `This will ${confirm.action} all ${confirm.ids.length} selected ${noun}s in the current filtered view. This cannot be undone.`
              : `${confirm.action === 'approve' ? 'Approve' : 'Reject'} this ${noun}? This action cannot be undone.`
          }
          confirmLabel={
            confirm.kind === 'bulk'
              ? `Yes, ${confirm.action === 'approve' ? 'Approve' : 'Reject'} All ${confirm.ids.length}`
              : confirm.action === 'approve' ? 'Yes, Approve' : 'Yes, Reject'
          }
          isLoading={isProcessing}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  )
}

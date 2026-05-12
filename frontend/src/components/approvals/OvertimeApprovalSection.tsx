import { useMemo, useState } from 'react'
import { ConfirmDialog } from '../../common/ConfirmDialog'
import { EmptyState } from '../../common/EmptyState'
import { Paginator } from '../../common/Paginator'
import { usePagination } from '../../common/usePagination'
import { SortableHeader } from '../../common/SortableHeader'
import type { SortDir } from '../../common/useSorting'
import { StatusBadge } from '../ui/StatusBadge'
import { formatDate } from '../../utils/date-utils'
import type { ApprovalOvertime } from '../../types/approvals'

type ConfirmState =
  | { kind: 'single'; id: string; action: 'approve' | 'reject' }
  | { kind: 'bulk'; ids: string[]; action: 'approve' | 'reject' }
  | null

interface Props {
  items: ApprovalOvertime[]
  onProcess: (id: string, action: 'approve' | 'reject') => void
  onBulkProcess: (ids: string[], action: 'approve' | 'reject') => void
  isPending: boolean
  isBulkPending: boolean
  showManager?: boolean
  managerById?: Record<string, string>
  ownerName?: string
}

export function OvertimeApprovalSection({
  items, onProcess, onBulkProcess, isPending, isBulkPending,
  showManager = false, managerById = {}, ownerName,
}: Props) {
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState<{ key: string; dir: SortDir }>({ key: 'date', dir: 'desc' })

  function toggle(key: string) {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' },
    )
  }

  function getSortValue(item: ApprovalOvertime, key: string): string | number {
    switch (key) {
      case 'employee_id': return item.users?.employee_id ?? ''
      case 'full_name':   return item.users?.full_name ?? ''
      case 'role':        return item.users?.role ?? ''
      case 'manager':
        return item.users?.manager_id
          ? (managerById[item.users.manager_id] ?? '')
          : (ownerName ?? '')
      case 'date':     return item.date
      case 'hours':    return item.hours
      case 'payout':   return Number(item.payout)
      case 'work_log': return item.work_log
      case 'status':   return item.status
      default:         return ''
    }
  }

  const sorted = useMemo(() => {
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
    usePagination(sorted)

  const allPageSelected = paged.length > 0 && paged.every((i) => selected.has(i.id))
  const visibleSelected = useMemo(() => paged.filter((i) => selected.has(i.id)), [paged, selected])

  function toggleAll() {
    if (allPageSelected) {
      setSelected((s) => { const n = new Set(s); paged.forEach((i) => n.delete(i.id)); return n })
    } else {
      setSelected((s) => { const n = new Set(s); paged.forEach((i) => n.add(i.id)); return n })
    }
  }

  function toggleOne(id: string) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function execConfirm() {
    if (!confirm) return
    if (confirm.kind === 'single') onProcess(confirm.id, confirm.action)
    else onBulkProcess(confirm.ids, confirm.action)
    setConfirm(null)
    setSelected(new Set())
  }

  if (items.length === 0) return <EmptyState message="No pending overtime entries." />

  const thCls = 'text-left'

  return (
    <>
      {/* Bulk actions */}
      {visibleSelected.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border-b border-blue-100">
          <span className="text-sm text-blue-700 font-medium">{visibleSelected.length} selected</span>
          <button
            onClick={() => setConfirm({ kind: 'bulk', ids: visibleSelected.map((i) => i.id), action: 'approve' })}
            disabled={isBulkPending}
            className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
          >
            Bulk Approve
          </button>
          <button
            onClick={() => setConfirm({ kind: 'bulk', ids: visibleSelected.map((i) => i.id), action: 'reject' })}
            disabled={isBulkPending}
            className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
          >
            Bulk Reject
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left">
              <th className="px-4 py-3 w-10">
                <input type="checkbox" checked={allPageSelected} onChange={toggleAll}
                  className="rounded border-slate-300" />
              </th>
              <SortableHeader label="Emp ID"    sortKey="employee_id" activeKey={sort.key} dir={sort.dir} onToggle={toggle} className={thCls} />
              <SortableHeader label="Name"      sortKey="full_name"   activeKey={sort.key} dir={sort.dir} onToggle={toggle} className={thCls} />
              <SortableHeader label="Role"      sortKey="role"        activeKey={sort.key} dir={sort.dir} onToggle={toggle} className={thCls} />
              {showManager && <SortableHeader label="Manager" sortKey="manager" activeKey={sort.key} dir={sort.dir} onToggle={toggle} className={thCls} />}
              <SortableHeader label="Date"      sortKey="date"        activeKey={sort.key} dir={sort.dir} onToggle={toggle} className={thCls} />
              <SortableHeader label="Hours"     sortKey="hours"       activeKey={sort.key} dir={sort.dir} onToggle={toggle} className={thCls} />
              <SortableHeader label="Payout (₹)" sortKey="payout"    activeKey={sort.key} dir={sort.dir} onToggle={toggle} className={thCls} />
              <SortableHeader label="Work Log"  sortKey="work_log"   activeKey={sort.key} dir={sort.dir} onToggle={toggle} className={thCls} />
              <SortableHeader label="Status"    sortKey="status"      activeKey={sort.key} dir={sort.dir} onToggle={toggle} className={thCls} />
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {paged.map((item) => (
              <tr
                key={item.id}
                onClick={() => toggleOne(item.id)}
                className={`cursor-pointer transition-colors ${selected.has(item.id) ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
              >
                <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleOne(item.id)}
                    className="rounded border-slate-300" />
                </td>
                <td className="px-4 py-3.5">
                  <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                    {item.users?.employee_id ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-3.5 font-medium text-slate-900">{item.users?.full_name ?? '—'}</td>
                <td className="px-4 py-3.5">
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
                  <td className="px-4 py-3.5 text-slate-600 text-sm">
                    {item.users?.manager_id
                      ? (managerById[item.users.manager_id] ?? '—')
                      : (ownerName ?? '—')}
                  </td>
                )}
                <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap font-medium">{formatDate(item.date)}</td>
                <td className="px-4 py-3.5 text-slate-700">{item.hours}h</td>
                <td className="px-4 py-3.5 text-slate-900 font-semibold">
                  ₹{Number(item.payout).toLocaleString('en-IN')}
                </td>
                <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate">{item.work_log}</td>
                <td className="px-4 py-3.5"><StatusBadge status={item.status} /></td>
                <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                  {item.status === 'applied' && (
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setConfirm({ kind: 'single', id: item.id, action: 'approve' })}
                        disabled={isPending}
                        className="text-xs px-2.5 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setConfirm({ kind: 'single', id: item.id, action: 'reject' })}
                        disabled={isPending}
                        className="text-xs px-2.5 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
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

      {confirm && (
        <ConfirmDialog
          title={`${confirm.kind === 'bulk' ? `Bulk ` : ''}${confirm.action === 'approve' ? 'Approve' : 'Reject'} Overtime`}
          description={
            confirm.kind === 'bulk'
              ? `${confirm.ids.length} overtime entries will be ${confirm.action}d.`
              : `This overtime entry will be ${confirm.action}d.`
          }
          confirmLabel={confirm.action === 'approve' ? 'Approve' : 'Reject'}
          isLoading={isPending || isBulkPending}
          onConfirm={execConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  )
}

import { useMemo, useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { LoadingSpinner } from '../../common/LoadingSpinner'
import { EmptyState } from '../../common/EmptyState'
import { ConfirmDialog } from '../../common/ConfirmDialog'
import { QuotationStatusBadge } from '../../components/quotations/QuotationStatusBadge'
import {
  useQuotations, useSubmitQuotation, useSelfApproveQuotation, useSelfRejectQuotation,
  useFinaliseQuotation, useCancelQuotation, useDeleteQuotation, defaultDateRange,
  usePendingQuotations, useProcessQuotation,
} from '../../hooks/useQuotations'
import { useAuthStore } from '../../store/auth.store'
import { parseApiError } from '../../utils/api-error'
import { useUsers, useReportableUsers, useMyManager } from '../../hooks/useUsers'
import type { Quotation, QuotationStatus, QuotationListParams } from '@soumya/shared'

// 'finalised' is excluded from the Quotation tab — finalised records live in the Offer tab only
const STATUS_OPTIONS: QuotationStatus[] = ['draft', 'requested', 'approved', 'rejected', 'cancelled']
// When 'All' is selected in the Quotation tab, we still exclude finalised
const ALL_QUOTATION_STATUSES: QuotationStatus[] = STATUS_OPTIONS
const LIMIT = 25

const chip = (active: boolean) =>
  `px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
    active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
  }`

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
const fmtMoney = (n: number) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

export default function QuotationList({ offerMode = false }: { offerMode?: boolean } = {}) {
  const { user } = useAuthStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const canApproveAny = user?.role !== 'employee'

  const { dateFrom: defaultFrom, dateTo: defaultTo } = defaultDateRange()

  // Queue mode = "Pending my approval" chip active; deep-linkable via ?queue=pending
  const [queueMode, setQueueMode] = useState(() => !offerMode && searchParams.get('queue') === 'pending')
  // Multi-select status set — in offer mode it's locked to {finalised}
  const [selectedStatuses, setSelectedStatuses] = useState<Set<QuotationStatus>>(offerMode ? new Set(['finalised']) : new Set())
  const [createdByFilter, setCreatedByFilter]   = useState<string>('')   // user UUID or '' = all
  const [search, setSearch]             = useState('')
  const [dateFrom, setDateFrom]         = useState(defaultFrom)
  const [dateTo, setDateTo]             = useState(defaultTo)
  const [page, setPage]                 = useState(1)
  const [sort, setSort] = useState<{ col: keyof Quotation; dir: 'asc' | 'desc' }>({ col: 'created_at', dir: 'desc' })
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: string; label: string } | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Reject modal (reason required)
  const [rejectingRow, setRejectingRow] = useState<Quotation | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectError, setRejectError]   = useState('')

  const submit        = useSubmitQuotation()
  const selfApprove   = useSelfApproveQuotation()
  const selfReject    = useSelfRejectQuotation()
  const finalise      = useFinaliseQuotation()
  const cancel        = useCancelQuotation()
  const deleteQ       = useDeleteQuotation()
  const processQ      = useProcessQuotation()

  // Badge count — pending queue in approver's scope (enabled only for approvers)
  const { data: pendingList = [] } = usePendingQuotations({ enabled: canApproveAny })
  const pendingCount = pendingList.length

  // Created By dropdown options — Owner sees all users; Manager sees self + team + owner; Employee hides dropdown
  const { data: allUsers = [] } = useUsers({ enabled: user?.role === 'owner' })
  const { data: team = [] }     = useReportableUsers({ enabled: user?.role === 'manager' })
  const { data: myManager }     = useMyManager()
  const creatorOptions: { id: string; full_name: string | null; employee_id: string }[] = useMemo(() => {
    if (user?.role === 'owner')   return allUsers.map((u) => ({ id: u.id, full_name: u.full_name, employee_id: u.employee_id }))
    if (user?.role === 'manager') {
      const self = { id: user.id, full_name: user.full_name ?? null, employee_id: user.employee_id }
      const others = team.filter((u) => u.id !== user.id).map((u) => ({ id: u.id, full_name: u.full_name, employee_id: u.employee_id }))
      // Manager's own manager is the Owner (or another manager — show whoever it is)
      const ownerOption = myManager ? [{ id: myManager.id, full_name: myManager.full_name, employee_id: myManager.employee_id }] : []
      return [self, ...others, ...ownerOption]
    }
    return []
  }, [user, allUsers, team, myManager])

  const queryParams: QuotationListParams = {
    status: offerMode
      ? ['finalised']
      : queueMode
        ? 'requested'
        : selectedStatuses.size > 0
          ? Array.from(selectedStatuses)
          : ALL_QUOTATION_STATUSES,   // Quotation tab 'All' = all non-finalised statuses
    createdBy: queueMode ? undefined : (createdByFilter || undefined),
    search:    search || undefined,
    dateFrom:  queueMode ? undefined : dateFrom,
    dateTo:    queueMode ? undefined : dateTo,
    limit:  LIMIT,
    offset: (page - 1) * LIMIT,
  }

  const { data: result, isLoading, isFetching } = useQuotations(queryParams)
  const quotations = result?.data  ?? []
  const total      = result?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  // Reset to last valid page if total shrinks
  useEffect(() => {
    if (page > totalPages) setPage(Math.max(1, totalPages))
  }, [totalPages, page])

  // Client-side sort within the current page slice
  const sorted = useMemo(() => {
    return [...quotations].sort((a, b) => {
      const cmp = String(a[sort.col] ?? '').localeCompare(String(b[sort.col] ?? ''), undefined, { numeric: true })
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [quotations, sort])

  function handleSort(col: keyof Quotation) {
    setSort((prev) => ({ col, dir: prev.col === col && prev.dir === 'asc' ? 'desc' : 'asc' }))
  }

  function SortIcon({ col }: { col: keyof Quotation }) {
    if (sort.col !== col) return <span className="ml-1 text-gray-300">↕</span>
    return <span className="ml-1 text-blue-600">{sort.dir === 'asc' ? '↑' : '↓'}</span>
  }

  // Filter helpers — reset page on filter change; selecting a status chip exits queue mode
  function toggleStatus(s: QuotationStatus) {
    if (queueMode) { setQueueMode(false); setSearchParams({}, { replace: true }) }
    setSelectedStatuses((prev) => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      return next
    })
    setPage(1)
  }
  function applyAllStatuses() {
    if (queueMode) { setQueueMode(false); setSearchParams({}, { replace: true }) }
    setSelectedStatuses(new Set())
    setPage(1)
  }
  function applyQueue() {
    setQueueMode(true); setSelectedStatuses(new Set()); setPage(1)
    setSearchParams({ queue: 'pending' }, { replace: true })
  }
  function applyCreatedBy(id: string) { setCreatedByFilter(id); setPage(1) }
  function applySearch(s: string)       { setSearch(s); setPage(1) }
  function applyDateRange(from: string, to: string) { setDateFrom(from); setDateTo(to); setPage(1) }
  function clearDates() { setDateFrom(defaultFrom); setDateTo(defaultTo); setPage(1) }

  function confirm(id: string, action: string, label: string) {
    setActionError(null)
    setConfirmAction({ id, action, label })
  }

  function executeAction() {
    if (!confirmAction) return
    const { id, action } = confirmAction

    if (action === 'delete') {
      deleteQ.mutate(id, {
        onSuccess: () => setConfirmAction(null),
        onError:   (err) => { setActionError(parseApiError(err)); setConfirmAction(null) },
      })
      return
    }

    if (action === 'approve') {
      executeApprove(id)
      return
    }

    const mut = action === 'submit'       ? submit
              : action === 'self-approve' ? selfApprove
              : action === 'self-reject'  ? selfReject
              : action === 'finalise'     ? finalise
              : cancel
    mut.mutate(id, {
      onSuccess: () => setConfirmAction(null),
      onError:   (err) => { setActionError(parseApiError(err)); setConfirmAction(null) },
    })
  }

  const isPending = submit.isPending || selfApprove.isPending || selfReject.isPending
    || finalise.isPending || cancel.isPending || deleteQ.isPending || processQ.isPending

  function executeApprove(id: string) {
    setActionError(null)
    processQ.mutate({ id, dto: { action: 'approve' } }, {
      onSuccess: () => setConfirmAction(null),
      onError: (err) => { setActionError(parseApiError(err)); setConfirmAction(null) },
    })
  }

  function executeReject() {
    if (!rejectingRow) return
    const reason = rejectReason.trim()
    if (!reason) { setRejectError('Rejection reason is required.'); return }
    processQ.mutate({ id: rejectingRow.id, dto: { action: 'reject', rejection_reason: reason } }, {
      onSuccess: () => { setRejectingRow(null); setRejectReason(''); setRejectError('') },
      onError: (err) => { setActionError(parseApiError(err)); setRejectingRow(null); setRejectReason(''); setRejectError('') },
    })
  }

  function ActionButtons({ q }: { q: Quotation }) {
    const isOwner   = user?.role === 'owner'
    const isCreator = q.created_by === user?.id
    // Approver = manager or owner, and not the creator (cannot approve own request)
    const canApprove = q.status === 'requested' && canApproveAny && !isCreator

    return (
      <div className="flex items-center gap-2 flex-wrap">
        <Link to={`/quotations/${q.id}`} className="text-xs text-blue-600 hover:underline">View</Link>

        {canApprove && (
          <>
            <button onClick={() => confirm(q.id, 'approve', 'Approve Quotation')} className="text-xs text-emerald-600 font-medium hover:underline">Approve</button>
            <button onClick={() => { setRejectingRow(q); setRejectReason(''); setRejectError('') }} className="text-xs text-red-600 font-medium hover:underline">Reject</button>
          </>
        )}

        {isCreator && (q.status === 'draft' || q.status === 'rejected') && (
          <Link to={`/quotations/${q.id}/edit`} className="text-xs text-blue-600 hover:underline">Edit</Link>
        )}

        {isCreator && q.status === 'draft' && !isOwner && (
          <button onClick={() => confirm(q.id, 'submit', 'Request for Approval')} className="text-xs text-indigo-600 hover:underline">Request</button>
        )}

        {isOwner && isCreator && q.status === 'draft' && (
          <>
            <button onClick={() => confirm(q.id, 'self-approve', 'Self-Approve')} className="text-xs text-green-600 hover:underline">Approve</button>
            <button onClick={() => confirm(q.id, 'self-reject',  'Self-Reject')}  className="text-xs text-red-600 hover:underline">Reject</button>
          </>
        )}

        {q.status === 'approved' && (
          <button onClick={() => confirm(q.id, 'finalise', 'Finalise')} className="text-xs text-emerald-600 hover:underline">Finalise</button>
        )}

        {isCreator && (q.status === 'draft' || q.status === 'rejected') && (
          <button onClick={() => confirm(q.id, 'cancel', 'Cancel Quotation')} className="text-xs text-red-400 hover:underline">Cancel</button>
        )}

        {/* Delete — only rejected/cancelled, only creator or owner */}
        {(q.status === 'rejected' || q.status === 'cancelled') && (isCreator || isOwner) && (
          <button onClick={() => confirm(q.id, 'delete', 'Delete Quotation')} className="text-xs text-red-600 font-medium hover:underline">Delete</button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">{offerMode ? 'Offers' : 'Quotations'}</h1>
        {!offerMode && (
          <Link to="/quotations/new" className="text-sm px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            + New Quotation
          </Link>
        )}
      </div>

      {actionError && (
        <div className="text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 flex items-center justify-between">
          <span>⚠ {actionError}</span>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Pending-my-approval chip (approvers only; hidden in offer mode) */}
        {canApproveAny && !offerMode && (
          <button onClick={applyQueue} className={chip(queueMode)}>
            Pending my approval
            {pendingCount > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full ${queueMode ? 'bg-white text-blue-600' : 'bg-amber-500 text-white'}`}>
                {pendingCount}
              </span>
            )}
          </button>
        )}

        {/* Status chips — multi-select; "All" clears. Hidden in offer mode (locked to finalised) */}
        {!offerMode && (
          <>
            <button onClick={applyAllStatuses} className={chip(!queueMode && selectedStatuses.size === 0)}>All</button>
            {STATUS_OPTIONS.map((s) => (
              <button key={s} onClick={() => toggleStatus(s)} className={chip(!queueMode && selectedStatuses.has(s))}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </>
        )}

        {/* Created By filter (owner + manager only) */}
        {creatorOptions.length > 0 && (
          <div className="flex items-center gap-2 ml-1">
            <span className="text-xs text-gray-500 whitespace-nowrap">Created by:</span>
            <select
              value={createdByFilter}
              onChange={(e) => applyCreatedBy(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[200px]"
            >
              <option value="">All users</option>
              {creatorOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name ?? u.employee_id} ({u.employee_id})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Date range filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500 whitespace-nowrap">Date:</span>
          <input
            type="date" value={dateFrom} max={dateTo}
            onChange={(e) => applyDateRange(e.target.value, dateTo)}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date" value={dateTo} min={dateFrom}
            onChange={(e) => applyDateRange(dateFrom, e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
          />
          <button onClick={clearDates}
            className="text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded-md px-2 py-1.5">
            Reset
          </button>
        </div>

        {/* Search — full width on mobile, auto on larger screens */}
        <input
          type="text"
          placeholder={offerMode ? 'Search client / offer ID…' : 'Search client / quotation ID…'}
          value={search}
          onChange={(e) => applySearch(e.target.value)}
          className="w-full sm:w-56 sm:ml-auto border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6"><LoadingSpinner /></div>
        ) : quotations.length === 0 && !isFetching ? (
          <EmptyState message="No quotations found." />
        ) : (
          <>
            <div className={`overflow-x-auto transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      ...(offerMode ? [{ key: 'offer_code',            label: 'Offer ID',      hideMobile: false }] : []),
                      { key: 'quotation_code',           label: 'Quotation ID',  hideMobile: true  },
                      { key: 'client_name',              label: 'Client Name',   hideMobile: false },
                      { key: 'quotation_date',           label: 'Date',          hideMobile: true  },
                      { key: 'delivery_date',            label: 'Delivery Date', hideMobile: true  },
                      { key: 'final_amount',             label: 'Final Amount',  hideMobile: false },
                      { key: 'creator_name_snapshot',    label: 'Created By',    hideMobile: true  },
                      ...(!offerMode ? [{ key: 'status', label: 'Status',        hideMobile: false }] : []),
                    ].map(({ key, label, hideMobile }) => (
                      <th
                        key={key}
                        onClick={() => handleSort(key as keyof Quotation)}
                        className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap${hideMobile ? ' hidden sm:table-cell' : ''}`}
                      >
                        {label}<SortIcon col={key as keyof Quotation} />
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sorted.map((q) => (
                    <tr key={q.id} className="hover:bg-gray-50">
                      {offerMode && (
                        <td className="px-4 py-3">
                          <Link to={`/quotations/${q.id}`} className="font-mono text-xs font-semibold text-emerald-700 hover:underline">
                            {q.offer_code ?? '—'}
                          </Link>
                        </td>
                      )}
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <Link to={`/quotations/${q.id}`} className="font-mono text-xs text-blue-600 hover:underline">{q.quotation_code}</Link>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{q.client_name}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap hidden sm:table-cell">{fmt(q.quotation_date)}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap hidden sm:table-cell">{fmt(q.delivery_date)}</td>
                      <td className="px-4 py-3 text-gray-800 font-medium whitespace-nowrap">{fmtMoney(q.final_amount)}</td>
                      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                        <div>{q.creator_name_snapshot}</div>
                        <div className="text-xs text-gray-400 font-mono">{q.creator_employee_id_snapshot}</div>
                      </td>
                      {!offerMode && <td className="px-4 py-3"><QuotationStatusBadge status={q.status} /></td>}
                      <td className="px-4 py-3"><ActionButtons q={q} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {total > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500">
                <span>
                  Showing{' '}
                  <span className="font-semibold text-slate-700">{(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)}</span>
                  {' '}of{' '}
                  <span className="font-semibold text-slate-700">{total}</span> records
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                  >‹</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((n) => Math.abs(n - page) <= 2)
                    .map((n) => (
                      <button
                        key={n}
                        onClick={() => setPage(n)}
                        className={`h-7 min-w-[28px] px-1.5 flex items-center justify-center rounded-md border text-xs font-medium ${
                          n === page
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-slate-300 text-slate-600 hover:bg-white'
                        }`}
                      >{n}</button>
                    ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                  >›</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {confirmAction && (
        <ConfirmDialog
          title={`${confirmAction.label}?`}
          description={
            confirmAction.action === 'delete'
              ? 'This will permanently delete this quotation. This cannot be undone.'
              : confirmAction.action === 'cancel'
              ? 'This will cancel the quotation and release inventory. This cannot be undone.'
              : confirmAction.action === 'finalise'
              ? 'This will finalise the quotation, consume inventory, and download the PDF.'
              : confirmAction.action === 'approve'
              ? 'This will approve the quotation and notify the creator.'
              : `Confirm: ${confirmAction.label}`
          }
          confirmLabel={confirmAction.label}
          isLoading={isPending}
          onConfirm={executeAction}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* Reject modal — requires reason */}
      {rejectingRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-y-auto p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Reject Quotation</h3>
              <p className="text-xs text-gray-500 mt-1 font-mono">{rejectingRow.quotation_code} · {rejectingRow.client_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Rejection Reason <span className="text-red-500">*</span></label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => { setRejectReason(e.target.value); if (rejectError) setRejectError('') }}
                placeholder="Tell the creator why this quotation was rejected…"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              {rejectError && <p className="mt-1 text-xs text-red-600">{rejectError}</p>}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setRejectingRow(null); setRejectReason(''); setRejectError('') }}
                disabled={isPending}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">
                Cancel
              </button>
              <button
                onClick={executeReject}
                disabled={isPending}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50">
                {isPending ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

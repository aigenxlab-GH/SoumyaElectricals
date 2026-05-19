import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Timecard, Overtime } from '@soumya/shared'
import { MonthPaginator } from '../../common/MonthPaginator'
import { LoadingSpinner } from '../../common/LoadingSpinner'
import { TimecardList } from '../../components/timecards/TimecardList'
import { TimecardForm } from '../../components/timecards/TimecardForm'
import { BulkTimecardForm } from '../../components/timecards/BulkTimecardForm'
import { OvertimeList } from '../../components/timecards/OvertimeList'
import { OvertimeForm } from '../../components/timecards/OvertimeForm'
import { useTimecards, useCreateTimecard, useBulkCreateTimecards, useUpdateTimecard, useDeleteTimecard } from '../../hooks/useTimecards'
import { useOvertime, useCreateOvertime, useUpdateOvertime, useDeleteOvertime } from '../../hooks/useOvertime'
import { useMyManager } from '../../hooks/useUsers'
import { parseApiError } from '../../utils/api-error'

type TcFormState = { mode: 'create' } | { mode: 'bulk' } | { mode: 'edit'; timecard: Timecard } | null
type OtFormState = { mode: 'create' } | { mode: 'edit'; entry: Overtime } | null

function Modal({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        </div>
        <div className="px-6 py-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}


export default function MyTimecard() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [tcForm, setTcForm] = useState<TcFormState>(null)
  const [otForm, setOtForm] = useState<OtFormState>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'applied' | 'approved' | 'rejected'>('all')

  const { data: timecards = [], isLoading: tcLoading } = useTimecards(year, month)
  const { data: overtime = [], isLoading: otLoading } = useOvertime(year, month)
  const { data: myManager } = useMyManager()

  const createTc = useCreateTimecard(year, month)
  const bulkTc = useBulkCreateTimecards(year, month)
  const updateTc = useUpdateTimecard(year, month)
  const deleteTc = useDeleteTimecard(year, month)

  const createOt = useCreateOvertime(year, month)
  const updateOt = useUpdateOvertime(year, month)
  const deleteOt = useDeleteOvertime(year, month)

  // Approver label — manager if employee has one, otherwise "Owner"
  const approverName = myManager?.full_name ?? 'Owner'
  const approverRole = myManager ? 'Manager' : 'Owner'

  // Filter function for timecards — status-based only (date pagination is via MonthPaginator)
  const tcFilterFn = useMemo(() => {
    if (statusFilter === 'all') return undefined
    return (tc: Timecard) => tc.status === statusFilter
  }, [statusFilter])

  // Same filter for overtime, since user asked overtime + timecard applied rows to be visible
  const otFilterFn = useMemo(() => {
    if (statusFilter === 'all') return undefined
    return (ot: Overtime) => ot.status === statusFilter
  }, [statusFilter])

  return (
    <div className="space-y-0">
      {/* ── Timecard Section ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-xl font-semibold text-gray-900">My Timecard</h1>
          <div className="flex flex-wrap items-center gap-2">
            <MonthPaginator year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m) }} />
            <button
              onClick={() => setTcForm({ mode: 'bulk' })}
              className="text-sm px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 whitespace-nowrap"
            >
              Bulk Add
            </button>
            <button
              onClick={() => setTcForm({ mode: 'create' })}
              className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 whitespace-nowrap"
            >
              + Timecard
            </button>
            <button
              onClick={() => setOtForm({ mode: 'create' })}
              className="text-sm px-3 py-1.5 bg-amber-600 text-white rounded-md hover:bg-amber-700 whitespace-nowrap"
            >
              + Overtime
            </button>
          </div>
        </div>

        {/* Status filter — applies to both Timecards and Overtime below */}
        <div className="flex items-end gap-3 bg-white border border-slate-200 rounded-lg p-3">
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
        </div>

        {tcLoading ? <LoadingSpinner /> : (
          <TimecardList
            timecards={timecards}
            onEdit={(tc) => setTcForm({ mode: 'edit', timecard: tc })}
            onDelete={(id) => deleteTc.mutate(id)}
            isDeleting={deleteTc.isPending}
            approverName={approverName}
            approverRole={approverRole}
            filterFn={tcFilterFn}
          />
        )}
      </div>

      {/* ── Thick divider between sections ── */}
      <div className="relative py-8">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t-4 border-slate-300 rounded-full" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-slate-100 px-4 text-sm font-semibold text-slate-500 uppercase tracking-widest">
            Overtime
          </span>
        </div>
      </div>

      {/* ── Overtime Section ── */}
      <div className="space-y-4">
        {otLoading ? <LoadingSpinner /> : (
          <OvertimeList
            entries={overtime}
            onEdit={(ot) => setOtForm({ mode: 'edit', entry: ot })}
            onDelete={(id) => deleteOt.mutate(id)}
            isDeleting={deleteOt.isPending}
            hidePayout
            filterFn={otFilterFn}
          />
        )}
      </div>

      {/* ── Modals ── */}
      {tcForm?.mode === 'create' && (
        <Modal title="Add Timecard">
          <TimecardForm mode="create" isPending={createTc.isPending} serverError={parseApiError(createTc.error)}
            onSubmit={(dto) => createTc.mutate(dto, { onSuccess: () => setTcForm(null) })}
            onCancel={() => setTcForm(null)} />
        </Modal>
      )}
      {tcForm?.mode === 'bulk' && (
        <Modal title="Bulk Add Timecards">
          <BulkTimecardForm isPending={bulkTc.isPending} serverError={parseApiError(bulkTc.error)}
            onSubmit={(dto) => bulkTc.mutate(dto, { onSuccess: () => setTcForm(null) })}
            onCancel={() => setTcForm(null)} />
        </Modal>
      )}
      {tcForm?.mode === 'edit' && (
        <Modal title="Edit Timecard">
          <TimecardForm mode="edit" editing={tcForm.timecard} isPending={updateTc.isPending} serverError={parseApiError(updateTc.error)}
            onSubmit={(dto) => updateTc.mutate({ id: tcForm.timecard.id, dto }, { onSuccess: () => setTcForm(null) })}
            onCancel={() => setTcForm(null)} />
        </Modal>
      )}
      {otForm?.mode === 'create' && (
        <Modal title="Add Overtime">
          <OvertimeForm mode="create" isPending={createOt.isPending} serverError={parseApiError(createOt.error)}
            onSubmit={(dto) => createOt.mutate(dto, { onSuccess: () => setOtForm(null) })}
            onCancel={() => setOtForm(null)} />
        </Modal>
      )}
      {otForm?.mode === 'edit' && (
        <Modal title="Edit Overtime">
          <OvertimeForm mode="edit" editing={otForm.entry} isPending={updateOt.isPending} serverError={parseApiError(updateOt.error)}
            onSubmit={(dto) => updateOt.mutate({ id: otForm.entry.id, dto }, { onSuccess: () => setOtForm(null) })}
            onCancel={() => setOtForm(null)} />
        </Modal>
      )}
    </div>
  )
}

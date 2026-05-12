import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ApplyLeaveSchema, UpdateLeaveSchema } from '@soumya/shared'
import type { ApplyLeaveDto, UpdateLeaveDto, Leave } from '@soumya/shared'
import { ErrorMessage } from '../../common/ErrorMessage'
import { formatDate } from '../../utils/date-utils'

type Props =
  | { mode: 'apply'; balanceRemaining: number; onSubmit: (dto: ApplyLeaveDto) => void; isPending: boolean; serverError?: string | null; onCancel: () => void }
  | { mode: 'edit'; editing: Leave; onSubmit: (dto: UpdateLeaveDto) => void; isPending: boolean; serverError?: string | null; onCancel: () => void }

const field = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const label = 'block text-sm font-medium text-gray-700 mb-1'

function LowBalanceWarning({ remaining }: { remaining: number }) {
  const msg = remaining <= 0
    ? `Your leave balance is ${remaining}. Applying this leave will put your account in deficit.`
    : `You have only ${remaining} day${remaining === 1 ? '' : 's'} remaining. This leave will reduce your balance further.`
  return (
    <div className="flex items-start gap-2.5 rounded-md bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm text-amber-800">
      <svg className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
      <span>{msg}</span>
    </div>
  )
}

export function LeaveForm(props: Props) {
  const applyForm = useForm<ApplyLeaveDto>({ resolver: zodResolver(ApplyLeaveSchema) })
  const editForm = useForm<UpdateLeaveDto>({
    resolver: zodResolver(UpdateLeaveSchema),
    defaultValues: props.mode === 'edit' ? { reason: props.editing.reason } : undefined,
  })

  const { isPending, serverError, onCancel } = props

  if (props.mode === 'edit') {
    const { handleSubmit, register, formState: { errors, isDirty } } = editForm
    return (
      <form onSubmit={handleSubmit(props.onSubmit)} className="space-y-4">
        <div>
          <p className={label}>Date</p>
          <p className="text-sm text-gray-900 py-2">{formatDate(props.editing.date)}</p>
        </div>
        <div>
          <label className={label}>Reason</label>
          <textarea {...register('reason')} rows={3} className={field} />
          {errors.reason && <p className="text-xs text-red-600 mt-1">{errors.reason.message}</p>}
        </div>
        {serverError && <ErrorMessage message={serverError} />}
        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={isPending || !isDirty}
            title={!isDirty ? 'No changes to save' : undefined}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">{isPending ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    )
  }

  const { handleSubmit, register, formState: { errors, isDirty } } = applyForm
  const showWarning = props.balanceRemaining <= 1

  return (
    <form onSubmit={handleSubmit(props.onSubmit)} className="space-y-4">
      <div>
        <label className={label}>Date</label>
        <input type="date" {...register('date')} className={field} />
        {errors.date && <p className="text-xs text-red-600 mt-1">{errors.date.message}</p>}
      </div>
      <div>
        <label className={label}>Reason</label>
        <textarea {...register('reason')} rows={3} className={field} placeholder="Reason for leave…" />
        {errors.reason && <p className="text-xs text-red-600 mt-1">{errors.reason.message}</p>}
      </div>
      {showWarning && <LowBalanceWarning remaining={props.balanceRemaining} />}
      {serverError && <ErrorMessage message={serverError} />}
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={isPending || !isDirty}
          title={!isDirty ? 'No changes to save' : undefined}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">{isPending ? 'Applying…' : 'Apply Leave'}</button>
      </div>
    </form>
  )
}

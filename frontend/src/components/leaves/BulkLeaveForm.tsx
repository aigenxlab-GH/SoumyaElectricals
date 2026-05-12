import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { BulkLeaveSchema } from '@soumya/shared'
import type { BulkLeaveDto } from '@soumya/shared'
import { ErrorMessage } from '../../common/ErrorMessage'
import { expandDateRange } from '../../utils/date-utils'

interface Props {
  balanceRemaining: number
  holidayDates?: string[]
  onSubmit: (dto: BulkLeaveDto) => void
  isPending: boolean
  serverError?: string | null
  onCancel: () => void
}

const field = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const label = 'block text-sm font-medium text-gray-700 mb-1'

function LowBalanceWarning({ remaining, applying }: { remaining: number; applying: number }) {
  const afterApply = remaining - applying
  const msg = afterApply < 0
    ? `Applying ${applying} day${applying === 1 ? '' : 's'} will put your balance into deficit (${afterApply} days).`
    : remaining <= applying
    ? `You have ${remaining} day${remaining === 1 ? '' : 's'} remaining. This will use your full balance.`
    : `You have ${remaining} day${remaining === 1 ? '' : 's'} remaining.`
  return (
    <div className="flex items-start gap-2.5 rounded-md bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm text-amber-800">
      <svg className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
      <span>{msg}</span>
    </div>
  )
}

export function BulkLeaveForm({ balanceRemaining, holidayDates = [], onSubmit, isPending, serverError, onCancel }: Props) {
  const { handleSubmit, register, control, formState: { errors, isDirty } } = useForm<BulkLeaveDto>({
    resolver: zodResolver(BulkLeaveSchema),
  })

  const startDate = useWatch({ control, name: 'start_date' })
  const endDate = useWatch({ control, name: 'end_date' })

  // Compute how many valid leave days would be applied
  const applyingDays = (startDate && endDate && endDate >= startDate)
    ? expandDateRange(startDate, endDate, holidayDates).length
    : 0

  const showWarning = applyingDays > 0 && balanceRemaining <= applyingDays

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Start Date</label>
          <input type="date" {...register('start_date')} className={field} />
          {errors.start_date && <p className="text-xs text-red-600 mt-1">{errors.start_date.message}</p>}
        </div>
        <div>
          <label className={label}>End Date</label>
          <input type="date" {...register('end_date')} className={field} />
          {errors.end_date && <p className="text-xs text-red-600 mt-1">{errors.end_date.message}</p>}
        </div>
      </div>
      {applyingDays > 0 && (
        <p className="text-xs text-gray-500">{applyingDays} working day{applyingDays === 1 ? '' : 's'} selected (Sundays &amp; holidays excluded).</p>
      )}
      {!applyingDays && (
        <p className="text-xs text-gray-500">Sundays and holidays will be automatically skipped.</p>
      )}
      <div>
        <label className={label}>Reason</label>
        <textarea {...register('reason')} rows={3} className={field} placeholder="Reason for leave…" />
        {errors.reason && <p className="text-xs text-red-600 mt-1">{errors.reason.message}</p>}
      </div>
      {showWarning && <LowBalanceWarning remaining={balanceRemaining} applying={applyingDays} />}
      {serverError && <ErrorMessage message={serverError} />}
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={isPending || !isDirty}
          title={!isDirty ? 'No changes to save' : undefined}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">{isPending ? 'Applying…' : 'Apply Bulk Leave'}</button>
      </div>
    </form>
  )
}

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { BulkTimecardSchema } from '@soumya/shared'
import type { BulkTimecardDto } from '@soumya/shared'
import { ErrorMessage } from '../../common/ErrorMessage'

interface Props {
  onSubmit: (dto: BulkTimecardDto) => void
  isPending: boolean
  serverError?: string | null
  onCancel: () => void
}

const field = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const label = 'block text-sm font-medium text-gray-700 mb-1'

export function BulkTimecardForm({ onSubmit, isPending, serverError, onCancel }: Props) {
  const { handleSubmit, register, formState: { errors, isDirty } } = useForm<BulkTimecardDto>({
    resolver: zodResolver(BulkTimecardSchema),
  })

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
      <p className="text-xs text-gray-500">Sundays and holidays will be automatically skipped.</p>
      <div>
        <label className={label}>Work Log</label>
        <textarea {...register('work_log')} rows={3} className={field} placeholder="Describe work done…" />
        {errors.work_log && <p className="text-xs text-red-600 mt-1">{errors.work_log.message}</p>}
      </div>
      {serverError && <ErrorMessage message={serverError} />}
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={isPending || !isDirty}
          title={!isDirty ? 'No changes to save' : undefined}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">{isPending ? 'Adding…' : 'Add Bulk Timecards'}</button>
      </div>
    </form>
  )
}

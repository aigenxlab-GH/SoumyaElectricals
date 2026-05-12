import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateOvertimeSchema, UpdateOvertimeSchema } from '@soumya/shared'
import type { CreateOvertimeDto, UpdateOvertimeDto, Overtime } from '@soumya/shared'
import { ErrorMessage } from '../../common/ErrorMessage'
import { formatDate } from '../../utils/date-utils'

type Props =
  | { mode: 'create'; onSubmit: (dto: CreateOvertimeDto) => void; isPending: boolean; serverError?: string | null; onCancel: () => void }
  | { mode: 'edit'; editing: Overtime; onSubmit: (dto: UpdateOvertimeDto) => void; isPending: boolean; serverError?: string | null; onCancel: () => void }

const field = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const label = 'block text-sm font-medium text-gray-700 mb-1'

export function OvertimeForm(props: Props) {
  const createForm = useForm<CreateOvertimeDto>({ resolver: zodResolver(CreateOvertimeSchema) })
  const editForm = useForm<UpdateOvertimeDto>({
    resolver: zodResolver(UpdateOvertimeSchema),
    defaultValues: props.mode === 'edit' ? { hours: props.editing.hours, work_log: props.editing.work_log } : undefined,
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
          <label className={label}>Hours</label>
          <input type="number" step="0.5" min="0.5" max="24" {...register('hours', { valueAsNumber: true })} className={field} />
          {errors.hours && <p className="text-xs text-red-600 mt-1">{errors.hours.message}</p>}
        </div>
        <div>
          <label className={label}>Work Log</label>
          <textarea {...register('work_log')} rows={3} className={field} />
          {errors.work_log && <p className="text-xs text-red-600 mt-1">{errors.work_log.message}</p>}
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

  const { handleSubmit, register, formState: { errors, isDirty } } = createForm
  return (
    <form onSubmit={handleSubmit(props.onSubmit)} className="space-y-4">
      <div>
        <label className={label}>Date</label>
        <input type="date" {...register('date')} className={field} />
        {errors.date && <p className="text-xs text-red-600 mt-1">{errors.date.message}</p>}
      </div>
      <div>
        <label className={label}>Hours</label>
        <input type="number" step="0.5" min="0.5" max="24" {...register('hours', { valueAsNumber: true })} className={field} />
        {errors.hours && <p className="text-xs text-red-600 mt-1">{errors.hours.message}</p>}
      </div>
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
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">{isPending ? 'Adding…' : 'Add Overtime'}</button>
      </div>
    </form>
  )
}

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateUserSchema, UpdateUserSchema } from '@soumya/shared'
import type { CreateUserDto, UpdateUserDto } from '@soumya/shared'
import type { User } from '../../types/models'
import { formatDate } from '../../utils/date-utils'

type CreateProps = {
  mode: 'create'
  managers: User[]
  isPending: boolean
  serverError: string | null
  onSubmit: (dto: CreateUserDto) => void
  onCancel: () => void
}
type EditProps = {
  mode: 'edit'
  editing: User
  managers: User[]
  /** Current monthly salary for this user — used to pre-fill the salary input. */
  currentSalary: number | null
  isPending: boolean
  serverError: string | null
  /** Called with the user DTO and (optionally) a new salary to record. */
  onSubmit: (dto: UpdateUserDto, newSalary?: number) => void
  onCancel: () => void
}
type Props = CreateProps | EditProps

function Field({ label, required, error, children }: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

const inputCls = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const readonlyCls = 'w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-500'

export function UserForm(props: Props) {
  const createForm = useForm<CreateUserDto>({
    resolver: zodResolver(CreateUserSchema),
    defaultValues: props.mode === 'create' ? {
      full_name: '', role: 'employee', sex: 'male',
      date_of_birth: '', date_of_joining: '', aadhaar: '',
      manager_id: null, phone: '', address: '', email: '',
    } : undefined,
  })
  const editForm = useForm<UpdateUserDto>({
    resolver: zodResolver(UpdateUserSchema),
    defaultValues: props.mode === 'edit' ? {
      full_name:     props.editing.full_name,
      role:          props.editing.role === 'owner' ? 'manager' : props.editing.role,
      sex:           props.editing.sex,
      date_of_birth: props.editing.date_of_birth,
      manager_id:    props.editing.manager_id,
      is_active:     props.editing.is_active,
      phone:         props.editing.phone ?? '',
      address:       props.editing.address ?? '',
      email:         props.editing.email  ?? '',
      aadhaar:       (props.editing as User & { aadhaar?: string }).aadhaar ?? '',
    } : undefined,
  })

  const isCreate = props.mode === 'create'
  const form = (isCreate ? createForm : editForm) as unknown as UseFormReturn<CreateUserDto>
  const { register, handleSubmit, watch, formState: { errors, isDirty } } = form
  const role = watch('role') as string | undefined

  // Salary input — managed locally for edit mode (it's NOT part of UpdateUserDto since salary lives in salary_history)
  const [editSalary, setEditSalary] = useState<string>(
    props.mode === 'edit' && props.currentSalary != null ? String(props.currentSalary) : ''
  )
  const [salaryDirty, setSalaryDirty] = useState(false)
  useEffect(() => {
    if (props.mode === 'edit') {
      setEditSalary(props.currentSalary != null ? String(props.currentSalary) : '')
      setSalaryDirty(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.mode === 'edit' ? props.currentSalary : null])

  const [salaryError, setSalaryError] = useState<string | null>(null)

  function onSubmit(values: CreateUserDto | UpdateUserDto) {
    setSalaryError(null)
    if (isCreate) {
      props.onSubmit(values as CreateUserDto)
      return
    }
    // Edit: validate salary if provided / dirty
    const editProps = props as EditProps
    let newSalary: number | undefined
    if (salaryDirty) {
      const n = editSalary.trim() === '' ? NaN : Number(editSalary)
      if (isNaN(n) || n <= 0) {
        setSalaryError('Monthly salary must be greater than 0')
        return
      }
      // Only send if actually different from current
      if (n !== editProps.currentSalary) newSalary = n
    }
    editProps.onSubmit(values as UpdateUserDto, newSalary)
  }

  const canSubmit = isCreate ? isDirty : (isDirty || salaryDirty)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* ── Employee ID (edit only, read-only) ── */}
      {!isCreate && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
          <input readOnly value={(props as EditProps).editing.employee_id} className={readonlyCls} />
        </div>
      )}

      {/* ── Full Name ── */}
      <Field label="Full Name" required error={errors.full_name?.message}>
        <input {...register('full_name')} className={inputCls} placeholder="Full name" />
      </Field>

      {/* ── Role & Sex ── */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Role" required error={errors.role?.message}>
          <select {...register('role')} className={inputCls}>
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            {isCreate && <option value="owner">Owner</option>}
          </select>
        </Field>
        <Field label="Sex" required error={errors.sex?.message}>
          <select {...register('sex')} className={inputCls}>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </Field>
      </div>

      {/* ── Dates ── */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Date of Birth" required error={errors.date_of_birth?.message}>
          <input type="date" max={new Date().toISOString().split('T')[0]} {...register('date_of_birth')} className={inputCls} />
        </Field>
        {isCreate ? (
          <Field label="Date of Joining" required error={createForm.formState.errors.date_of_joining?.message}>
            <input type="date" max={new Date().toISOString().split('T')[0]} {...createForm.register('date_of_joining')} className={inputCls} />
          </Field>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Joining</label>
            <input readOnly value={formatDate((props as EditProps).editing.date_of_joining)} className={readonlyCls} />
          </div>
        )}
      </div>

      {/* ── Manager (mandatory for Employee role) ── */}
      {role === 'employee' && (
        <Field label="Manager" required error={errors.manager_id?.message}>
          <select {...register('manager_id')} className={inputCls}>
            <option value="">— Select Manager —</option>
            {props.managers.map((m) => (
              <option key={m.id} value={m.id}>{m.full_name} ({m.employee_id})</option>
            ))}
          </select>
        </Field>
      )}

      {/* ── Aadhaar — visible in both modes ── */}
      <Field label="Aadhaar (12 digits)" required error={
        isCreate
          ? createForm.formState.errors.aadhaar?.message
          : editForm.formState.errors.aadhaar?.message
      }>
        <input {...register('aadhaar')} maxLength={12} className={inputCls}
          placeholder="123456789012" inputMode="numeric" />
      </Field>

      {/* ── Phone ── */}
      <Field label="Phone Number" required error={
        isCreate
          ? createForm.formState.errors.phone?.message
          : editForm.formState.errors.phone?.message
      }>
        <input {...register('phone')} className={inputCls}
          placeholder="e.g. 9876543210 or +91 9876543210" inputMode="tel" maxLength={15} />
        <p className="mt-1 text-xs text-gray-400">10-digit Indian mobile starting with 6, 7, 8, or 9</p>
      </Field>

      {/* ── Address ── */}
      <Field label="Address" required error={
        isCreate
          ? createForm.formState.errors.address?.message
          : editForm.formState.errors.address?.message
      }>
        <textarea {...register('address')} rows={3} className={inputCls}
          placeholder="Full residential address" />
      </Field>

      {/* ── Email (optional) ── */}
      <Field label="Email (optional)" error={
        isCreate
          ? createForm.formState.errors.email?.message
          : editForm.formState.errors.email?.message
      }>
        <input {...register('email')} type="email" className={inputCls}
          placeholder="e.g. employee@example.com" />
      </Field>

      {/* ── Monthly Salary (both modes, same UI) ── */}
      {isCreate ? (
        <Field label="Monthly Salary (₹)" required error={createForm.formState.errors.monthly_salary?.message}>
          <input
            {...createForm.register('monthly_salary', { setValueAs: (v) => v === '' ? undefined : Number(v) })}
            type="number" step="0.01" min={1}
            className={inputCls} placeholder="e.g. 25000" />
          <p className="text-xs text-gray-400 mt-1">Used to generate payroll. Effective from the joining date.</p>
        </Field>
      ) : (
        <Field label="Monthly Salary (₹)" required error={salaryError ?? undefined}>
          <input
            type="number" step="0.01" min={1}
            value={editSalary}
            onChange={(e) => { setEditSalary(e.target.value); setSalaryDirty(true); setSalaryError(null) }}
            className={inputCls} placeholder="e.g. 25000" />
          <p className="text-xs text-gray-400 mt-1">Changing this records a new salary effective from today; past values are kept in history.</p>
        </Field>
      )}

      {/* ── Account Status toggle (edit only) ── */}
      {!isCreate && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Account Status</label>
          <label className="inline-flex items-center gap-3 cursor-pointer select-none group">
            <input type="checkbox" {...editForm.register('is_active')} className="sr-only peer" />
            <span className="relative w-11 h-6 rounded-full transition-colors duration-200
              bg-red-200 peer-checked:bg-green-500
              after:content-[''] after:absolute after:top-0.5 after:left-0.5
              after:w-5 after:h-5 after:rounded-full after:bg-white
              after:shadow after:transition-transform after:duration-200
              peer-checked:after:translate-x-5" />
            <span className="text-sm font-medium text-gray-700 peer-checked:text-green-700 transition-colors">
              {editForm.watch('is_active') ? 'Active — user can log in' : 'Inactive — login blocked'}
            </span>
          </label>
        </div>
      )}

      {/* ── Server error ── */}
      {props.serverError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {props.serverError}
        </p>
      )}

      {/* ── Actions ── */}
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={props.onCancel} className="btn-secondary px-4 py-2">
          Cancel
        </button>
        <button type="submit" disabled={props.isPending || !canSubmit}
          title={!canSubmit ? 'No changes to save' : undefined}
          className="btn-primary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed">
          {props.isPending ? 'Saving…' : isCreate ? 'Create User' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}

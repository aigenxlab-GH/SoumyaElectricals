import { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { SystemConfigSchema } from '@soumya/shared'
import type { SystemConfigDto } from '@soumya/shared'
import { LoadingSpinner } from '../../common/LoadingSpinner'
import { ConfirmDialog } from '../../common/ConfirmDialog'
import { useSystemConfig, useSaveConfig } from '../../hooks/useConfig'

const inputCls = 'border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function SystemConfig() {
  const { data, isLoading } = useSystemConfig()
  const { mutate: save, isPending, error: saveError } = useSaveConfig()
  // Annual leave days can only be edited in December (IST). Other settings remain free to edit.
  const istMonth = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getMonth() + 1
  const isDecember = istMonth === 12
  const [showConfirm, setShowConfirm] = useState(false)
  const [pendingValues, setPendingValues] = useState<SystemConfigDto | null>(null)
  const [cancelledLeaves, setCancelledLeaves] = useState<number | null>(null)
  const [savedOk, setSavedOk] = useState(false)
  const [duplicateDatesError, setDuplicateDatesError] = useState<string | null>(null)

  const { register, control, handleSubmit, reset, formState: { errors, isDirty } } = useForm<SystemConfigDto>({
    resolver: zodResolver(SystemConfigSchema),
    defaultValues: {
      annual_leave_days: 21, overtime_rate_per_hour: 100, manager_overtime_rate_per_hour: 150, gst_pct: 18,
      brand_name: '', company_name: 'Soumya Earthing Electrodes', company_address: '', gstin_no: '',
      company_email: '', company_phone: '', company_website: '', authorized_signatory: '', holidays: [],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'holidays' })

  useEffect(() => {
    if (data) {
      reset({
        annual_leave_days: data.annual_leave_days,
        overtime_rate_per_hour: data.overtime_rate_per_hour,
        manager_overtime_rate_per_hour: data.manager_overtime_rate_per_hour,
        gst_pct: data.gst_pct ?? 18,
        brand_name: data.brand_name ?? '',
        company_name: data.company_name ?? 'Soumya Earthing Electrodes',
        company_address: data.company_address ?? '',
        gstin_no: data.gstin_no ?? '',
        company_email: data.company_email ?? '',
        company_phone: data.company_phone ?? '',
        company_website: data.company_website ?? '',
        authorized_signatory: data.authorized_signatory ?? '',
        holidays: data.holidays.map((h) => ({ date: h.date, name: h.name })),
      })
    }
  }, [data, reset])

  function onSubmit(values: SystemConfigDto) {
    // Guard: detect duplicate holiday dates before hitting the server
    const dates = values.holidays.map((h) => h.date).filter(Boolean)
    const seen = new Set<string>()
    const dupes = new Set<string>()
    for (const d of dates) {
      if (seen.has(d)) dupes.add(d)
      else seen.add(d)
    }
    if (dupes.size > 0) {
      const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      setDuplicateDatesError(
        `Each holiday must have a unique date. Please keep only one entry per date. Duplicate${dupes.size > 1 ? 's' : ''}: ${[...dupes].map(fmt).join(', ')}`
      )
      return
    }
    setDuplicateDatesError(null)
    setPendingValues(values)
    setShowConfirm(true)
  }

  function confirmSave() {
    if (!pendingValues) return
    setCancelledLeaves(null)
    save(pendingValues, {
      onSuccess: (result) => {
        setShowConfirm(false)
        setPendingValues(null)
        setSavedOk(true)
        setTimeout(() => setSavedOk(false), 3000)
        if (result.cancelledLeaves > 0) setCancelledLeaves(result.cancelledLeaves)
      },
    })
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">System Configuration</h1>

      {savedOk && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm">
          <svg className="h-5 w-5 text-green-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">Configuration updated successfully.</span>
        </div>
      )}

      {duplicateDatesError && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">
          <svg className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-semibold">Duplicate Holiday Dates</p>
            <p className="mt-0.5">{duplicateDatesError}</p>
          </div>
        </div>
      )}

      {saveError && (
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          <span className="mt-0.5">⚠</span>
          <span>
            {(() => {
              const raw = (saveError as { response?: { data?: { error?: { message?: string } } } })
                .response?.data?.error?.message ?? (saveError as Error).message ?? ''
              if (raw.includes('duplicate key') || raw.includes('holidays_date_key'))
                return 'Duplicate holiday dates detected. Please keep only one entry per date and try again.'
              return `Failed to save configuration: ${raw}`
            })()}
          </span>
        </div>
      )}

      {cancelledLeaves !== null && cancelledLeaves > 0 && (
        <div className="flex items-start justify-between gap-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">
          <span>
            <strong>{cancelledLeaves} leave{cancelledLeaves !== 1 ? 's' : ''}</strong> on the new holiday dates
            {cancelledLeaves === 1 ? ' was' : ' were'} automatically cancelled and the balance{cancelledLeaves !== 1 ? 's' : ''} restored.
          </span>
          <button type="button" onClick={() => setCancelledLeaves(null)} className="text-amber-600 hover:text-amber-800 font-bold leading-none">✕</button>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Company branding */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <h2 className="text-base font-medium text-gray-900">Company Branding</h2>
          <p className="text-xs text-gray-500 -mt-2">Used on quotation PDFs, headers, and printed documents.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name</label>
              <input type="text" {...register('brand_name')} className={`${inputCls} w-full`} placeholder="e.g. Soumya Earthing Electrodes" />
              {errors.brand_name && <p className="mt-1 text-xs text-red-600">{errors.brand_name.message}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input type="text" {...register('company_name')} className={`${inputCls} w-full`} placeholder="Legal entity name" />
              {errors.company_name && <p className="mt-1 text-xs text-red-600">{errors.company_name.message}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea rows={2} {...register('company_address')} className={`${inputCls} w-full`} placeholder="Full registered address" />
              {errors.company_address && <p className="mt-1 text-xs text-red-600">{errors.company_address.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN No.</label>
              <input type="text" {...register('gstin_no')} className={`${inputCls} w-full uppercase`} placeholder="22AAAAA0000A1Z5" maxLength={15} />
              {errors.gstin_no && <p className="mt-1 text-xs text-red-600">{errors.gstin_no.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input type="tel" {...register('company_phone')} className={`${inputCls} w-full`} placeholder="+91 9876543210" />
              {errors.company_phone && <p className="mt-1 text-xs text-red-600">{errors.company_phone.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input type="email" {...register('company_email')} className={`${inputCls} w-full`} placeholder="contact@company.com" />
              {errors.company_email && <p className="mt-1 text-xs text-red-600">{errors.company_email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website <span className="text-gray-400 font-normal">(optional)</span></label>
              <input type="url" {...register('company_website')} className={`${inputCls} w-full`} placeholder="https://example.com" />
              {errors.company_website && <p className="mt-1 text-xs text-red-600">{errors.company_website.message}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Authorized Signatory</label>
              <input type="text" {...register('authorized_signatory')} className={`${inputCls} w-full`} placeholder="e.g. Director's full name" />
              {errors.authorized_signatory && <p className="mt-1 text-xs text-red-600">{errors.authorized_signatory.message}</p>}
            </div>
          </div>
        </div>

        {/* General settings */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <h2 className="text-base font-medium text-gray-900">General Settings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Annual Leave Days
                {!isDecember && <span className="ml-1.5 text-xs font-normal text-amber-600">🔒 editable in December only</span>}
              </label>
              <input type="number" {...register('annual_leave_days', { valueAsNumber: true })}
                disabled={!isDecember}
                title={!isDecember ? 'Annual leave days can only be updated in December' : undefined}
                className={`${inputCls} w-full ${!isDecember ? 'bg-gray-100 cursor-not-allowed' : ''}`} min={1} max={365} />
              {errors.annual_leave_days && (
                <p className="mt-1 text-xs text-red-600">{errors.annual_leave_days.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee Overtime Rate (₹/hour)</label>
              <input type="number" {...register('overtime_rate_per_hour', { valueAsNumber: true })}
                className={`${inputCls} w-full`} min={1} step={0.5} />
              {errors.overtime_rate_per_hour && (
                <p className="mt-1 text-xs text-red-600">{errors.overtime_rate_per_hour.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Manager Overtime Rate (₹/hour)</label>
              <input type="number" {...register('manager_overtime_rate_per_hour', { valueAsNumber: true })}
                className={`${inputCls} w-full`} min={1} step={0.5} />
              {errors.manager_overtime_rate_per_hour && (
                <p className="mt-1 text-xs text-red-600">{errors.manager_overtime_rate_per_hour.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GST Rate (%)</label>
              <input type="number" {...register('gst_pct', { valueAsNumber: true })}
                className={`${inputCls} w-full`} min={0} max={100} step={0.5} />
              {errors.gst_pct && (
                <p className="mt-1 text-xs text-red-600">{errors.gst_pct.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Holiday list */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium text-gray-900">Holidays ({fields.length})</h2>
            <button type="button" onClick={() => append({ date: '', name: '' })}
              className="text-sm px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50">
              + Add Holiday
            </button>
          </div>

          {fields.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No holidays configured. Saving with an empty list will remove all holidays.</p>
          ) : (
            <div className="space-y-2">
              {fields.map((field, idx) => (
                <div key={field.id} className="flex items-start gap-3">
                  <div className="flex-1">
                    <input type="date" {...register(`holidays.${idx}.date`)}
                      className={`${inputCls} w-full`} />
                    {errors.holidays?.[idx]?.date && (
                      <p className="mt-1 text-xs text-red-600">{errors.holidays[idx].date?.message}</p>
                    )}
                  </div>
                  <div className="flex-1">
                    <input type="text" {...register(`holidays.${idx}.name`)}
                      placeholder="Holiday name" className={`${inputCls} w-full`} />
                    {errors.holidays?.[idx]?.name && (
                      <p className="mt-1 text-xs text-red-600">{errors.holidays[idx].name?.message}</p>
                    )}
                  </div>
                  <button type="button" onClick={() => remove(idx)}
                    className="mt-0.5 text-sm px-2 py-2 text-red-600 hover:bg-red-50 rounded">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={isPending || !isDirty}
            title={!isDirty ? 'No changes to save' : undefined}
            className="px-6 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
            Save Configuration
          </button>
        </div>
      </form>

      {showConfirm && (
        <ConfirmDialog
          title="Save configuration?"
          description="This will overwrite all current settings and the holiday list. Continue?"
          confirmLabel="Yes, Save"
          isLoading={isPending}
          onConfirm={confirmSave}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  )
}

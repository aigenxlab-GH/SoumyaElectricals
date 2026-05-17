import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { SetSalarySchema } from '@soumya/shared'
import type { SetSalaryDto } from '@soumya/shared'
import { useSalaryHistory, useSetSalary } from '../../hooks/useSalary'
import { LoadingSpinner } from '../../common/LoadingSpinner'
import { parseApiError } from '../../utils/api-error'
import { formatDate } from '../../utils/date-utils'

const fmtMoney = (n: number) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const inputCls = 'border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full'

interface Props { userId: string }

export function SalarySection({ userId }: Props) {
  const { data: history = [], isLoading } = useSalaryHistory(userId)
  const setSalary = useSetSalary(userId)
  const [serverError, setServerError] = useState<string | null>(null)
  const [savedOk, setSavedOk] = useState(false)

  const todayISO = new Date().toISOString().split('T')[0]
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<SetSalaryDto>({
    resolver: zodResolver(SetSalarySchema),
    defaultValues: { effective_from: todayISO },
  })

  function onSubmit(dto: SetSalaryDto) {
    setServerError(null)
    setSavedOk(false)
    setSalary.mutate(dto, {
      onSuccess: () => {
        reset({ effective_from: todayISO, monthly_salary: undefined as unknown as number, note: '' })
        setSavedOk(true)
        setTimeout(() => setSavedOk(false), 3000)
      },
      onError: (err) => setServerError(parseApiError(err)),
    })
  }

  const current = history[0]

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-medium text-gray-900">Salary</h2>
          <p className="text-xs text-gray-500 mt-0.5">Owner-only. Used to generate monthly payroll. Changes are effective-dated.</p>
        </div>
        {current && (
          <div className="text-right">
            <p className="text-xs text-gray-500">Current</p>
            <p className="text-lg font-bold text-gray-900">{fmtMoney(current.monthly_salary)}</p>
            <p className="text-[10px] text-gray-400">since {formatDate(current.effective_from)}</p>
          </div>
        )}
      </div>

      {savedOk && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-md px-3 py-2 text-xs">Salary saved.</div>
      )}
      {serverError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2 text-xs">⚠ {serverError}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div className="md:col-span-1">
          <label className="block text-xs font-medium text-gray-700 mb-1">Monthly Salary (₹)</label>
          <input type="number" step="0.01" min={1}
            {...register('monthly_salary', { valueAsNumber: true })}
            className={inputCls} placeholder="e.g. 25000" />
          {errors.monthly_salary && <p className="text-xs text-red-600 mt-1">{errors.monthly_salary.message}</p>}
        </div>
        <div className="md:col-span-1">
          <label className="block text-xs font-medium text-gray-700 mb-1">Effective From</label>
          <input type="date" {...register('effective_from')} className={inputCls} />
          {errors.effective_from && <p className="text-xs text-red-600 mt-1">{errors.effective_from.message}</p>}
        </div>
        <div className="md:col-span-1">
          <label className="block text-xs font-medium text-gray-700 mb-1">Note (optional)</label>
          <input type="text" {...register('note')} className={inputCls} placeholder="e.g. Annual revision" />
        </div>
        <div className="md:col-span-1">
          <button type="submit" disabled={setSalary.isPending || !isDirty}
            className="w-full px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {setSalary.isPending ? 'Saving…' : 'Set Salary'}
          </button>
        </div>
      </form>

      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">History</p>
        {isLoading ? <LoadingSpinner /> : history.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No salary set yet. Set one above to enable payroll for this user.</p>
        ) : (
          <table className="w-full text-sm border border-gray-200 rounded-md overflow-hidden">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr><th className="px-3 py-2 text-left">Effective From</th><th className="px-3 py-2 text-right">Monthly Salary</th><th className="px-3 py-2 text-left">Note</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="px-3 py-2 text-gray-700">{formatDate(h.effective_from)}</td>
                  <td className="px-3 py-2 text-right font-medium text-gray-900">{fmtMoney(h.monthly_salary)}</td>
                  <td className="px-3 py-2 text-gray-500">{h.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

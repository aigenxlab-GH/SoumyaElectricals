import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { LoadingSpinner } from '../../common/LoadingSpinner'
import { UserForm } from '../../components/users/UserForm'
import { useUser, useUsers, useUpdateUser } from '../../hooks/useUsers'
import { useCurrentSalary, useSetSalary, useSalaryHistory } from '../../hooks/useSalary'
import { formatDate } from '../../utils/date-utils'
import { parseApiError } from '../../utils/api-error'
import type { UpdateUserDto } from '@soumya/shared'

const fmtMoney = (n: number) =>
  `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function toServerError(error: unknown): string | null {
  if (!error) return null
  if (error instanceof Error) {
    if (error.message.includes('LINKED_EMPLOYEES')) return 'Cannot change role — this manager has linked employees. Reassign them first.'
    return error.message
  }
  return 'Something went wrong'
}

export default function EditUser() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: user, isLoading } = useUser(id!)
  const { data: allUsers = [] } = useUsers()
  const { mutate: updateUser, isPending: userPending, error: userError } = useUpdateUser(id!)
  const { data: currentSalary } = useCurrentSalary(id ?? '', { enabled: !!id })
  const { data: salaryHistory = [] } = useSalaryHistory(id ?? '', { enabled: !!id })
  const setSalary = useSetSalary(id ?? '')
  const [actionError, setActionError] = useState<string | null>(null)

  const managers = allUsers.filter((u) => u.role === 'manager' && u.is_active && u.id !== id)

  if (isLoading || !user) return <LoadingSpinner />

  const isOwnerRow = user.role === 'owner'

  function handleSubmit(dto: UpdateUserDto, newSalary?: number) {
    setActionError(null)
    updateUser(dto, {
      onSuccess: () => {
        if (newSalary !== undefined && id && !isOwnerRow) {
          // Record salary as effective from today
          const today = new Date().toISOString().split('T')[0]
          setSalary.mutate(
            { monthly_salary: newSalary, effective_from: today, note: 'Updated via Edit User' },
            {
              onSuccess: () => navigate('/owner/users'),
              onError:   (err) => setActionError(parseApiError(err)),
            }
          )
        } else {
          navigate('/owner/users')
        }
      },
      onError: () => { /* UserForm shows serverError prop */ },
    })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Edit User — {user.full_name}</h1>

      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          ⚠ {actionError}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <UserForm
          mode="edit"
          editing={user}
          managers={managers}
          currentSalary={isOwnerRow ? null : (currentSalary?.monthly_salary ?? null)}
          isPending={userPending || setSalary.isPending}
          serverError={toServerError(userError)}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/owner/users')}
        />
      </div>

      {/* Salary history (read-only, view-only) */}
      {!isOwnerRow && salaryHistory.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Salary History</h2>
            <span className="text-xs text-gray-400">{salaryHistory.length} {salaryHistory.length === 1 ? 'entry' : 'entries'}</span>
          </div>
          <table className="w-full text-sm border border-gray-200 rounded-md overflow-hidden">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Effective From</th>
                <th className="px-3 py-2 text-right">Monthly Salary</th>
                <th className="px-3 py-2 text-left">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {salaryHistory.map((h) => (
                <tr key={h.id}>
                  <td className="px-3 py-2 text-gray-700">{formatDate(h.effective_from)}</td>
                  <td className="px-3 py-2 text-right font-medium text-gray-900">{fmtMoney(h.monthly_salary)}</td>
                  <td className="px-3 py-2 text-gray-500">{h.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

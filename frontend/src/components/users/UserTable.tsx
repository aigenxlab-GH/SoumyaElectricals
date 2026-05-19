import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../../common/EmptyState'
import { ConfirmDialog } from '../../common/ConfirmDialog'
import { Paginator } from '../../common/Paginator'
import { usePagination } from '../../common/usePagination'
import { useSorting } from '../../common/useSorting'
import { SortableHeader } from '../../common/SortableHeader'
import { useResetPassword, useDeleteUser, useSetUserActive } from '../../hooks/useUsers'
import { useAuthStore } from '../../store/auth.store'
import { parseApiError } from '../../utils/api-error'
import type { User } from '../../types/models'
import { formatDate } from '../../utils/date-utils'

type EnrichedUser = User & { manager_name: string; manager_emp_id: string }

interface Props {
  users: User[]
}

function RoleBadge({ role }: { role: User['role'] }) {
  const cls =
    role === 'owner'   ? 'bg-purple-100 text-purple-700' :
    role === 'manager' ? 'bg-blue-100 text-blue-700' :
                         'bg-gray-100 text-gray-700'
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${cls}`}>{role}</span>
  )
}

export function UserTable({ users }: Props) {
  const { user: currentUser } = useAuthStore()
  const resetPassword  = useResetPassword()
  const deleteUser     = useDeleteUser()
  const setUserActive  = useSetUserActive()
  const [confirmReset, setConfirmReset]       = useState<User | null>(null)
  const [confirmDelete, setConfirmDelete]     = useState<User | null>(null)
  const [confirmToggle, setConfirmToggle]     = useState<User | null>(null)   // activate / deactivate
  const [resetResult, setResetResult] = useState<{ ok: boolean; message: string } | null>(null)

  function handleToggleConfirm() {
    if (!confirmToggle) return
    const target = confirmToggle
    const newActive = !target.is_active
    setUserActive.mutate({ id: target.id, is_active: newActive }, {
      onSuccess: () => {
        setConfirmToggle(null)
        setResetResult({
          ok: true,
          message: `${target.full_name} (${target.employee_id}) has been ${newActive ? 'activated' : 'deactivated'}.`,
        })
      },
      onError: (err) => {
        setConfirmToggle(null)
        setResetResult({ ok: false, message: parseApiError(err) ?? 'Failed to update user status' })
      },
    })
  }

  function handleDeleteConfirm() {
    if (!confirmDelete) return
    const target = confirmDelete
    deleteUser.mutate(target.id, {
      onSuccess: (res) => {
        setConfirmDelete(null)
        setResetResult({ ok: true, message: `${res.full_name} (${res.employee_id}) has been permanently removed from the system.` })
      },
      onError: (err) => {
        setConfirmDelete(null)
        setResetResult({ ok: false, message: parseApiError(err) ?? 'Failed to delete user' })
      },
    })
  }

  function handleResetConfirm() {
    if (!confirmReset) return
    const target = confirmReset
    resetPassword.mutate(target.id, {
      onSuccess: (res) => {
        setConfirmReset(null)
        setResetResult({
          ok: true,
          message: `Password for ${res.full_name} (${res.employee_id}) has been reset to the default "${res.default_password}". Please inform the user — they will be forced to change it on next login.`,
        })
      },
      onError: (err) => {
        setConfirmReset(null)
        setResetResult({ ok: false, message: parseApiError(err) ?? 'Failed to reset password' })
      },
    })
  }

  const enriched = useMemo<EnrichedUser[]>(() => {
    const byId = Object.fromEntries(users.map((u) => [u.id, u]))
    const owner = users.find((u) => u.role === 'owner') ?? null
    return users.map((u) => {
      const mgr = u.manager_id ? byId[u.manager_id] : u.role === 'manager' ? owner : null
      return { ...u, manager_name: mgr?.full_name ?? '', manager_emp_id: mgr?.employee_id ?? '' }
    })
  }, [users])

  const { sorted, sort, toggle } = useSorting(enriched, 'date_of_joining', 'desc')
  const { paged, page, totalPages, pageSize, total, rangeStart, rangeEnd, setPage, setPageSize } =
    usePagination(sorted)

  if (!users.length) return <EmptyState message="No users found." />

  const thCls = 'text-left'

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-xl">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <SortableHeader label="Emp ID"  sortKey="employee_id"    activeKey={sort.key} dir={sort.dir} onToggle={toggle} className={`${thCls} hidden sm:table-cell`} />
            <SortableHeader label="Name"    sortKey="full_name"       activeKey={sort.key} dir={sort.dir} onToggle={toggle} className={thCls} />
            <SortableHeader label="Role"    sortKey="role"            activeKey={sort.key} dir={sort.dir} onToggle={toggle} className={thCls} />
            <SortableHeader label="Manager" sortKey="manager_name"    activeKey={sort.key} dir={sort.dir} onToggle={toggle} className={`${thCls} hidden sm:table-cell`} />
            <SortableHeader label="Joined"  sortKey="date_of_joining" activeKey={sort.key} dir={sort.dir} onToggle={toggle} className={`${thCls} hidden sm:table-cell`} />
            <SortableHeader label="Status"  sortKey="is_active"       activeKey={sort.key} dir={sort.dir} onToggle={toggle} className={thCls} />
            <th className="px-4 py-3 text-right font-semibold text-slate-500 uppercase tracking-wider text-xs">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-100">
          {paged.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3.5 hidden sm:table-cell">
                  <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                    {user.employee_id}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <Link
                    to={`/owner/users/${user.id}`}
                    className="font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {user.full_name}
                  </Link>
                </td>
                <td className="px-4 py-3.5"><RoleBadge role={user.role} /></td>
                <td className="px-4 py-3.5 text-slate-600 hidden sm:table-cell">
                  {user.manager_name ? (
                    <>
                      <span>{user.manager_name}</span>
                      <span className="text-slate-400 text-xs ml-1">({user.manager_emp_id})</span>
                    </>
                  ) : '—'}
                </td>
                <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap hidden sm:table-cell">
                  {formatDate(user.date_of_joining)}
                </td>
                <td className="px-4 py-3.5">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right">
                  {user.role !== 'owner' && (
                    <div className="inline-flex items-center gap-2">
                      <Link
                        to={`/owner/users/${user.id}/edit`}
                        className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                      >
                        Edit
                      </Link>

                      {/* Activate / Deactivate — not for self */}
                      {currentUser?.id !== user.id && (
                        user.is_active ? (
                          <button
                            onClick={() => setConfirmToggle(user)}
                            disabled={setUserActive.isPending}
                            title="Deactivate this user — they won't be able to log in"
                            className="text-xs px-3 py-1.5 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 font-medium transition-colors disabled:opacity-50"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => setConfirmToggle(user)}
                            disabled={setUserActive.isPending}
                            title="Re-activate this user so they can log in again"
                            className="text-xs px-3 py-1.5 border border-green-300 text-green-700 rounded-lg hover:bg-green-50 font-medium transition-colors disabled:opacity-50"
                          >
                            Activate
                          </button>
                        )
                      )}

                      {/* Reset Password — not for self */}
                      {currentUser?.id !== user.id && (
                        <button
                          onClick={() => setConfirmReset(user)}
                          disabled={resetPassword.isPending}
                          title="Reset this user's password back to the default"
                          className="text-xs px-3 py-1.5 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 font-medium transition-colors disabled:opacity-50"
                        >
                          Reset Pwd
                        </button>
                      )}

                      {/* Delete — only for inactive users, not for self */}
                      {currentUser?.id !== user.id && !user.is_active && (
                        <button
                          onClick={() => setConfirmDelete(user)}
                          disabled={deleteUser.isPending}
                          title="Permanently remove this inactive user from the system"
                          className="text-xs px-3 py-1.5 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 font-medium transition-colors disabled:opacity-50"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
          ))}
        </tbody>
      </table>
      <Paginator
        page={page} totalPages={totalPages} pageSize={pageSize}
        total={total} rangeStart={rangeStart} rangeEnd={rangeEnd}
        onPageChange={setPage} onPageSizeChange={setPageSize}
      />

      {/* Activate / Deactivate — confirmation dialog */}
      {confirmToggle && (
        <ConfirmDialog
          title={confirmToggle.is_active ? 'Deactivate user?' : 'Activate user?'}
          description={
            confirmToggle.is_active
              ? `${confirmToggle.full_name} (${confirmToggle.employee_id}) will no longer be able to log in. Their records are kept intact. You can re-activate them any time.`
              : `${confirmToggle.full_name} (${confirmToggle.employee_id}) will regain access and be able to log in again.`
          }
          confirmLabel={confirmToggle.is_active ? 'Yes, Deactivate' : 'Yes, Activate'}
          isLoading={setUserActive.isPending}
          onConfirm={handleToggleConfirm}
          onCancel={() => setConfirmToggle(null)}
        />
      )}

      {/* Reset Password — confirmation dialog */}
      {confirmReset && (
        <ConfirmDialog
          title="Reset password?"
          description={`Reset password for ${confirmReset.full_name} (${confirmReset.employee_id}) back to the default "12345678"? The user will be forced to change it on next login. You won't see the password they set afterwards.`}
          confirmLabel="Yes, Reset Password"
          isLoading={resetPassword.isPending}
          onConfirm={handleResetConfirm}
          onCancel={() => setConfirmReset(null)}
        />
      )}

      {/* Permanent Delete — confirmation dialog */}
      {confirmDelete && (
        <ConfirmDialog
          title="Permanently delete user?"
          description={`This will REMOVE ${confirmDelete.full_name} (${confirmDelete.employee_id}) from the system along with their timecards, leaves, overtime, leave balance, salary history, and payroll records. This cannot be undone. Products / quotations / inventory created by this user are kept (created-by becomes blank). Continue?`}
          confirmLabel="Yes, Delete Permanently"
          isLoading={deleteUser.isPending}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Reset result — auto-dismiss toast */}
      {resetResult && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md">
          <div className={`rounded-lg shadow-lg border px-5 py-4 ${resetResult.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
            <div className="flex items-start gap-3">
              <span className="text-lg leading-none mt-0.5">{resetResult.ok ? '✓' : '⚠'}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold mb-0.5">{resetResult.ok ? 'Done' : 'Error'}</p>
                <p className="text-xs">{resetResult.message}</p>
              </div>
              <button onClick={() => setResetResult(null)} className="text-current opacity-50 hover:opacity-100 text-sm">✕</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

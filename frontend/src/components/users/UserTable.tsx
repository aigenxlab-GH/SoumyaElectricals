import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../../common/EmptyState'
import { Paginator } from '../../common/Paginator'
import { usePagination } from '../../common/usePagination'
import { useSorting } from '../../common/useSorting'
import { SortableHeader } from '../../common/SortableHeader'
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
            <SortableHeader label="Emp ID" sortKey="employee_id" activeKey={sort.key} dir={sort.dir} onToggle={toggle} className={thCls} />
            <SortableHeader label="Name" sortKey="full_name" activeKey={sort.key} dir={sort.dir} onToggle={toggle} className={thCls} />
            <SortableHeader label="Role" sortKey="role" activeKey={sort.key} dir={sort.dir} onToggle={toggle} className={thCls} />
            <SortableHeader label="Manager" sortKey="manager_name" activeKey={sort.key} dir={sort.dir} onToggle={toggle} className={thCls} />
            <SortableHeader label="Joined" sortKey="date_of_joining" activeKey={sort.key} dir={sort.dir} onToggle={toggle} className={thCls} />
            <SortableHeader label="Status" sortKey="is_active" activeKey={sort.key} dir={sort.dir} onToggle={toggle} className={thCls} />
            <th className="px-4 py-3 text-right font-semibold text-slate-500 uppercase tracking-wider text-xs">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-100">
          {paged.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3.5">
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
                <td className="px-4 py-3.5 text-slate-600">
                  {user.manager_name ? (
                    <>
                      <span>{user.manager_name}</span>
                      <span className="text-slate-400 text-xs ml-1">({user.manager_emp_id})</span>
                    </>
                  ) : '—'}
                </td>
                <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                  {formatDate(user.date_of_joining)}
                </td>
                <td className="px-4 py-3.5">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right">
                  {user.role !== 'owner' && (
                    <Link
                      to={`/owner/users/${user.id}/edit`}
                      className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                    >
                      Edit
                    </Link>
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
    </div>
  )
}

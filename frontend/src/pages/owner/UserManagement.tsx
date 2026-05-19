import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LoadingSpinner } from '../../common/LoadingSpinner'
import { FilterBar } from '../../common/FilterBar'
import type { ActiveFilter } from '../../common/FilterBar'
import { UserTable } from '../../components/users/UserTable'
import { useUsers } from '../../hooks/useUsers'

export default function UserManagement() {
  const { data: users = [], isLoading } = useUsers()
  const [activeFilter, setActiveFilter] = useState<ActiveFilter | null>(null)

  const managers = useMemo(
    () => users.filter((u) => u.role === 'manager' || u.role === 'owner'),
    [users],
  )

  const filtered = useMemo(() => {
    if (!activeFilter) return users
    const { criteria, value, from, to } = activeFilter
    return users.filter((u) => {
      if (criteria === 'emp_id')     return u.employee_id.toLowerCase().includes(value.toLowerCase())
      if (criteria === 'name')       return u.full_name.toLowerCase().includes(value.toLowerCase())
      if (criteria === 'role')       return !value || u.role === value
      if (criteria === 'manager')    return !value || u.manager_id === value
      if (criteria === 'status')     return !value || u.is_active === (value === 'active')
      if (criteria === 'date')       return u.date_of_joining === value
      if (criteria === 'date_range') return (!from || u.date_of_joining >= from) && (!to || u.date_of_joining <= to)
      return true
    })
  }, [users, activeFilter])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Users</h1>
        <div className="flex items-center gap-3">
          {activeFilter && (
            <span className="text-sm text-slate-500">{filtered.length} of {users.length} shown</span>
          )}
          <Link to="/owner/users/new" className="btn-primary px-4 py-2 text-sm">
            + Add User
          </Link>
        </div>
      </div>

      <FilterBar
        onFilter={setActiveFilter}
        onClear={() => setActiveFilter(null)}
        dateLabel="Joining Date"
        showRole
        showManager
        showStatus
        managers={managers}
      />

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6"><LoadingSpinner /></div>
        ) : (
          <UserTable users={filtered} />
        )}
      </div>
    </div>
  )
}

import { useRef, useState } from 'react'
import { MonthPaginator } from '../../common/MonthPaginator'
import { LoadingSpinner } from '../../common/LoadingSpinner'
import { AttendanceCalendar } from '../../components/calendar/AttendanceCalendar'
import { CalendarLegend } from '../../components/calendar/CalendarLegend'
import { useCalendarData } from '../../hooks/useCalendar'
import { useUsers } from '../../hooks/useUsers'
import type { User } from '../../types/models'

function UserSearchDropdown({
  users,
  selectedUserId,
  onSelect,
  disabled,
}: {
  users: User[]
  selectedUserId: string | undefined
  onSelect: (id: string | undefined) => void
  disabled?: boolean
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const selectedUser = users.find((u) => u.id === selectedUserId)

  const filtered = query.trim()
    ? users.filter(
        (u) =>
          u.full_name.toLowerCase().includes(query.toLowerCase()) ||
          u.employee_id.toLowerCase().includes(query.toLowerCase()),
      )
    : users

  function handleFocus() {
    setQuery('')
    setOpen(true)
  }

  function handleSelect(user: User) {
    onSelect(user.id)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onSelect(undefined)
    setQuery('')
    setOpen(false)
  }

  function handleBlur(e: React.FocusEvent) {
    // Close only when focus leaves the entire widget (input + list)
    if (!listRef.current?.contains(e.relatedTarget as Node)) {
      setOpen(false)
      setQuery('')
    }
  }

  const displayValue = open ? query : (selectedUser ? `${selectedUser.full_name} (${selectedUser.employee_id})` : '')

  return (
    <div className="relative" style={{ minWidth: '240px' }}>
      <div className="flex items-center border border-gray-300 rounded-md bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Search manager…"
          disabled={disabled}
          className="flex-1 px-3 py-1.5 text-sm bg-transparent outline-none disabled:text-gray-400 min-w-0"
        />
        {selectedUser && !open && (
          <button
            type="button"
            onMouseDown={handleClear}
            className="px-2 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
          >
            ✕
          </button>
        )}
        <span className="px-2 text-gray-400 pointer-events-none select-none">▾</span>
      </div>

      {open && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">No employees found</div>
          ) : (
            filtered.map((u) => (
              <button
                key={u.id}
                type="button"
                onMouseDown={() => handleSelect(u)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors ${
                  u.id === selectedUserId ? 'bg-blue-50 font-medium text-blue-700' : 'text-gray-800'
                }`}
              >
                <span>{u.full_name}</span>
                <span className="ml-1.5 text-xs text-gray-400">({u.employee_id})</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function TeamCalendar() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>()

  const { data: users = [], isLoading: usersLoading } = useUsers()
  const { data, isLoading: calLoading } = useCalendarData(year, month, selectedUserId)

  const activeUsers = users.filter((u) => u.role === 'manager' && u.is_active)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Team Calendar</h1>
        <div className="flex flex-wrap items-center gap-3">
          <UserSearchDropdown
            users={activeUsers}
            selectedUserId={selectedUserId}
            onSelect={setSelectedUserId}
            disabled={usersLoading}
          />
          <MonthPaginator year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m) }} />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        {calLoading ? (
          <LoadingSpinner />
        ) : selectedUserId ? (
          <>
            <AttendanceCalendar year={year} month={month} data={data ?? {}} />
            <div className="border-t border-gray-100 pt-4">
              <CalendarLegend />
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-400 text-center py-10">Select a manager to view their calendar.</p>
        )}
      </div>
    </div>
  )
}

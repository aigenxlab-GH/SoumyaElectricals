import { useState } from 'react'

export type FilterCriteria = 'emp_id' | 'name' | 'date' | 'date_range' | 'role' | 'manager' | 'status'

export interface ActiveFilter {
  criteria: FilterCriteria
  value: string
  from: string
  to: string
}

interface ManagerOption {
  id: string
  full_name: string
  employee_id: string
}

interface Props {
  onFilter: (f: ActiveFilter) => void
  onClear: () => void
  dateLabel?: string    // e.g. "Date" or "Joining Date"
  showRole?: boolean    // show Role option (default false)
  showManager?: boolean // show Manager option (default false)
  showStatus?: boolean  // show Status option (default false)
  managers?: ManagerOption[]  // list of managers for the Manager dropdown
}

const inputCls =
  'border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white h-9'

export function FilterBar({
  onFilter,
  onClear,
  dateLabel = 'Date',
  showRole = false,
  showManager = false,
  showStatus = false,
  managers = [],
}: Props) {
  const CRITERIA_OPTIONS: { value: FilterCriteria; label: string }[] = [
    { value: 'emp_id', label: 'Employee ID' },
    { value: 'name',   label: 'Name' },
    ...(showRole    ? [{ value: 'role'    as FilterCriteria, label: 'Role'    }] : []),
    ...(showManager ? [{ value: 'manager' as FilterCriteria, label: 'Manager' }] : []),
    ...(showStatus  ? [{ value: 'status'  as FilterCriteria, label: 'Status'  }] : []),
    { value: 'date',       label: dateLabel },
    { value: 'date_range', label: `${dateLabel} Range` },
  ]

  const [criteria, setCriteria] = useState<FilterCriteria>('emp_id')
  const [value, setValue] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [applied, setApplied] = useState(false)

  function handleCriteriaChange(c: FilterCriteria) {
    setCriteria(c)
    setValue('')
    setFrom('')
    setTo('')
    if (applied) {
      setApplied(false)
      onClear()
    }
  }

  function handleFilter() {
    setApplied(true)
    onFilter({ criteria, value, from, to })
  }

  function handleClear() {
    setValue('')
    setFrom('')
    setTo('')
    setApplied(false)
    onClear()
  }

  return (
    <div className="flex flex-wrap items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
      {/* Label */}
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
        Filter by
      </span>

      {/* Criteria dropdown */}
      <select
        value={criteria}
        onChange={(e) => handleCriteriaChange(e.target.value as FilterCriteria)}
        className={`${inputCls} pr-8`}
        style={{ minWidth: '140px' }}
      >
        {CRITERIA_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* ── Dynamic value input based on selected criteria ── */}

      {(criteria === 'emp_id' || criteria === 'name') && (
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
          placeholder={criteria === 'emp_id' ? 'e.g. SE_5001' : 'Enter name…'}
          className={`${inputCls} w-48`}
        />
      )}

      {criteria === 'role' && (
        <select value={value} onChange={(e) => setValue(e.target.value)}
          className={`${inputCls} pr-8`} style={{ minWidth: '140px' }}>
          <option value="">All Roles</option>
          <option value="manager">Manager</option>
          <option value="employee">Employee</option>
        </select>
      )}

      {criteria === 'manager' && (
        <select value={value} onChange={(e) => setValue(e.target.value)}
          className={`${inputCls} pr-8`} style={{ minWidth: '200px' }}>
          <option value="">All Managers</option>
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name} ({m.employee_id})
            </option>
          ))}
        </select>
      )}

      {criteria === 'status' && (
        <select value={value} onChange={(e) => setValue(e.target.value)}
          className={`${inputCls} pr-8`} style={{ minWidth: '140px' }}>
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      )}

      {criteria === 'date' && (
        <input type="date" value={value} onChange={(e) => setValue(e.target.value)}
          className={inputCls} title={dateLabel} />
      )}

      {criteria === 'date_range' && (
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className={inputCls} title="From" />
          <span className="text-slate-400 text-sm font-medium">to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className={inputCls} title="To" />
        </div>
      )}

      {/* Filter button */}
      <button
        type="button"
        onClick={handleFilter}
        className="h-9 px-4 text-sm font-semibold text-white rounded-lg
          bg-gradient-to-br from-blue-500 to-blue-700
          shadow-[0_2px_6px_rgba(37,99,235,0.4)]
          hover:from-blue-600 hover:to-blue-800 hover:-translate-y-px
          transition-all duration-150"
      >
        Filter
      </button>

      {applied && (
        <button
          type="button"
          onClick={handleClear}
          className="h-9 px-3 text-sm font-medium text-slate-600 rounded-lg
            border border-slate-300 hover:bg-slate-100 transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  )
}

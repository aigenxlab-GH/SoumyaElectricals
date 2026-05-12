import type { SortDir } from './useSorting'

interface Props {
  label: string
  sortKey: string
  activeKey: string
  dir: SortDir
  onToggle: (key: string) => void
  className?: string
}

export function SortableHeader({ label, sortKey, activeKey, dir, onToggle, className = '' }: Props) {
  const isActive = sortKey === activeKey
  return (
    <th
      className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer select-none hover:text-slate-700 whitespace-nowrap ${className}`}
      onClick={() => onToggle(sortKey)}
    >
      <span className="flex items-center gap-1">
        {label}
        <span className="text-slate-400">
          {isActive ? (dir === 'asc' ? '▲' : '▼') : '⇅'}
        </span>
      </span>
    </th>
  )
}

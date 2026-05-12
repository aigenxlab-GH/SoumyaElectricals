import type { PageSize } from './usePagination'

interface Props {
  page: number
  totalPages: number
  pageSize: PageSize
  total: number
  rangeStart: number
  rangeEnd: number
  onPageChange: (p: number) => void
  onPageSizeChange: (s: PageSize) => void
}

const PAGE_SIZE_OPTIONS: { value: PageSize; label: string }[] = [
  { value: 10, label: '10' },
  { value: 15, label: '15' },
  { value: 'all', label: 'All' },
]

export function Paginator({
  page, totalPages, pageSize, total, rangeStart, rangeEnd,
  onPageChange, onPageSizeChange,
}: Props) {
  if (total === 0) return null

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
      {/* Left: record count */}
      <p className="text-xs text-slate-500">
        Showing{' '}
        <span className="font-semibold text-slate-700">{rangeStart}–{rangeEnd}</span>
        {' '}of{' '}
        <span className="font-semibold text-slate-700">{total}</span>
        {' '}records
      </p>

      {/* Right: page-size dropdown + prev/next */}
      <div className="flex items-center gap-3">
        {/* Page size dropdown */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">Rows:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              const v = e.target.value
              onPageSizeChange(v === 'all' ? 'all' : (Number(v) as PageSize))
            }}
            className="text-xs border border-slate-300 rounded-md px-2 py-1 bg-white
              focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {PAGE_SIZE_OPTIONS.map((o) => (
              <option key={String(o.value)} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Prev / Page info / Next */}
        {pageSize !== 'all' && totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="h-7 w-7 flex items-center justify-center rounded-md text-slate-600
                border border-slate-300 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors text-xs"
              aria-label="Previous page"
            >
              ‹
            </button>

            {/* Page number buttons — show up to 5 around current */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((n) => Math.abs(n - page) <= 2)
              .map((n) => (
                <button
                  key={n}
                  onClick={() => onPageChange(n)}
                  className={`h-7 min-w-[28px] px-1.5 flex items-center justify-center rounded-md text-xs font-medium
                    border transition-colors ${
                      n === page
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'border-slate-300 text-slate-600 hover:bg-white'
                    }`}
                >
                  {n}
                </button>
              ))}

            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              className="h-7 w-7 flex items-center justify-center rounded-md text-slate-600
                border border-slate-300 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors text-xs"
              aria-label="Next page"
            >
              ›
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

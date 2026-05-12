import { Fragment, useState, useEffect, useCallback, useMemo } from 'react'
import { useBlocker } from 'react-router-dom'
import { LoadingSpinner } from '../../common/LoadingSpinner'
import { EmptyState } from '../../common/EmptyState'
import { ConfirmDialog } from '../../common/ConfirmDialog'
import { useInventory, useSaveForecast } from '../../hooks/useInventory'
import { useAuthStore } from '../../store/auth.store'
import { parseApiError } from '../../utils/api-error'
import type { InventoryRow } from '@soumya/shared'

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
}

type DirtyMap = Record<string, Record<string, string>> // product_id → monday → value (M only)
type SortDir = 'asc' | 'desc'
// `${monday}:M` | `${monday}:A` for weekly subcols, plus 'reserved'
type SortKey = 'code' | 'product' | 'reserved' | string

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 text-gray-300 text-xs">↕</span>
  return <span className="ml-1 text-xs">{dir === 'asc' ? '↑' : '↓'}</span>
}

export default function InventoryPage() {
  const { data: rows = [], isLoading } = useInventory()
  const saveForecast = useSaveForecast()
  const { user } = useAuthStore()
  const canEdit = user?.role === 'owner' || user?.role === 'manager'

  // Derive list of visible Mondays from the first row (server-driven).
  const mondays = useMemo(() => (rows[0]?.weeks ?? []).map((w) => w.monday), [rows])

  const [dirty, setDirty] = useState<DirtyMap>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedOk, setSavedOk] = useState(false)
  const hasDirty = Object.values(dirty).some((m) => Object.values(m).some((v) => v !== ''))

  // Sorting state
  const [sortKey, setSortKey] = useState<SortKey>('code')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  // Navigate-away blocker
  const blocker = useBlocker(() => hasDirty)

  // Reset dirty state when fresh data arrives after save
  useEffect(() => {
    setDirty({})
  }, [rows])

  function handleCellChange(productId: string, monday: string, val: string) {
    setDirty((prev) => ({
      ...prev,
      [productId]: { ...(prev[productId] ?? {}), [monday]: val },
    }))
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortedRows = useMemo(() => {
    const sorted = [...rows].sort((a: InventoryRow, b: InventoryRow) => {
      let valA: string | number
      let valB: string | number

      if (sortKey === 'code') {
        valA = a.product_code.toLowerCase()
        valB = b.product_code.toLowerCase()
      } else if (sortKey === 'product') {
        valA = a.product_name.toLowerCase()
        valB = b.product_name.toLowerCase()
      } else if (sortKey === 'reserved') {
        valA = a.reserved
        valB = b.reserved
      } else {
        // Weekly subcol: "<monday>:M" | "<monday>:A"
        const [monday, sub] = sortKey.split(':') as [string, 'M' | 'A']
        const cellA = a.weeks.find((w) => w.monday === monday)
        const cellB = b.weeks.find((w) => w.monday === monday)
        valA = cellA?.[sub] ?? 0
        valB = cellB?.[sub] ?? 0
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1
      if (valA > valB) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [rows, sortKey, sortDir])

  const handleSave = useCallback(() => {
    setSaveError(null)
    const entries: Array<{ product_id: string; forecast_date: string; qty_added: number }> = []
    for (const [productId, mondayMap] of Object.entries(dirty)) {
      for (const [monday, val] of Object.entries(mondayMap)) {
        const num = parseInt(val, 10)
        if (!isNaN(num) && num > 0) {
          entries.push({ product_id: productId, forecast_date: monday, qty_added: num })
        }
      }
    }
    if (entries.length === 0) return
    saveForecast.mutate(
      { entries },
      {
        onSuccess: () => {
          setSavedOk(true)
          setTimeout(() => setSavedOk(false), 3000)
        },
        onError: (err) => setSaveError(parseApiError(err)),
      }
    )
  }, [dirty, saveForecast])

  const thFixed = (active: boolean) =>
    `px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:bg-gray-100 transition-colors ${active ? 'text-blue-700' : 'text-gray-500'}`

  const thSubCol = (active: boolean, color: string) =>
    `px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:bg-gray-200 transition-colors ${active ? 'text-blue-700' : color}`

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Inventory</h1>
        {canEdit && (
          <button
            onClick={handleSave}
            disabled={!hasDirty || saveForecast.isPending}
            className="text-sm px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40"
          >
            {saveForecast.isPending ? 'Saving…' : 'Save Forecast'}
          </button>
        )}
      </div>

      <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
        <strong className="text-amber-700">Reserved</strong> = Total qty reserved across all active quotations ·{' '}
        <strong>M</strong> = Manufactured this week (editable) ·{' '}
        <strong className="text-green-700">A</strong> = Available as of this week (cumulative manufactured − reserved − consumed)
      </div>

      {savedOk && (
        <div className="text-sm bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3">
          ✓ Forecast saved. Inventory quantities updated.
        </div>
      )}
      {saveError && (
        <div className="text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3">⚠ {saveError}</div>
      )}
      {hasDirty && canEdit && (
        <div className="text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3">
          You have unsaved forecast changes. Click <strong>Save Forecast</strong> to apply.
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6"><LoadingSpinner /></div>
        ) : rows.length === 0 ? (
          <EmptyState message="No active products in inventory." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm border-separate border-spacing-0">
              <thead className="bg-gray-50">
                {/* Row 1 — top headers (Monday date spans 3 sub-cols) */}
                <tr>
                  <th rowSpan={2} className={thFixed(sortKey === 'code')} onClick={() => handleSort('code')}>
                    Product ID <SortIcon active={sortKey === 'code'} dir={sortDir} />
                  </th>
                  <th rowSpan={2} className={thFixed(sortKey === 'product')} onClick={() => handleSort('product')}>
                    Product <SortIcon active={sortKey === 'product'} dir={sortDir} />
                  </th>
                  <th rowSpan={2} className={`${thFixed(sortKey === 'reserved')} text-center border-l border-gray-200`} onClick={() => handleSort('reserved')}>
                    Reserved <SortIcon active={sortKey === 'reserved'} dir={sortDir} />
                  </th>
                  {mondays.map((m) => (
                    <th
                      key={m}
                      colSpan={2}
                      className="px-2 py-2 text-center text-xs font-semibold text-blue-700 uppercase tracking-wider whitespace-nowrap border-l border-gray-200"
                    >
                      {fmtDate(m)}
                    </th>
                  ))}
                </tr>
                {/* Row 2 — sub-headers (M, A per Monday) */}
                <tr>
                  {mondays.map((m) => {
                    const kM = `${m}:M`
                    const kA = `${m}:A`
                    return (
                      <Fragment key={m}>
                        <th className={`${thSubCol(sortKey === kM, 'text-gray-600')} border-l border-gray-200`} onClick={() => handleSort(kM)}>
                          M <SortIcon active={sortKey === kM} dir={sortDir} />
                        </th>
                        <th className={thSubCol(sortKey === kA, 'text-green-700')} onClick={() => handleSort(kA)}>
                          A <SortIcon active={sortKey === kA} dir={sortDir} />
                        </th>
                      </Fragment>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedRows.map((row) => (
                  <tr key={row.product_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 border-b border-gray-100">{row.product_code}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 border-b border-gray-100">{row.product_name}</td>
                    <td className={`px-4 py-3 text-center text-sm font-medium border-b border-gray-100 border-l border-gray-200 ${row.reserved > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
                      {row.reserved}
                    </td>
                    {row.weeks.map((cell, weekIdx) => {
                      const dirtyVal = dirty[row.product_id]?.[cell.monday]
                      const savedVal = cell.M > 0 ? String(cell.M) : ''
                      const inputVal = dirtyVal ?? savedVal
                      const isDirty = dirtyVal !== undefined && dirtyVal !== ''
                      // Live A — cell.A from server + unsaved M for THIS week and any earlier visible week.
                      // Typing M in week K bumps A for all weeks N ≥ K (cumulative).
                      let liveA = cell.A
                      const productDirty = dirty[row.product_id] ?? {}
                      for (let j = 0; j <= weekIdx; j++) {
                        const raw = productDirty[row.weeks[j].monday]
                        const n = raw === undefined ? NaN : parseInt(raw, 10)
                        if (!isNaN(n) && n > 0) liveA += n
                      }
                      if (liveA < 0) liveA = 0
                      return (
                        <Fragment key={cell.monday}>
                          {/* M — editable */}
                          <td className="px-2 py-3 text-center border-b border-gray-100 border-l border-gray-200">
                            <input
                              type="number"
                              min={1}
                              step={1}
                              value={inputVal}
                              disabled={!canEdit}
                              onChange={(e) => handleCellChange(row.product_id, cell.monday, e.target.value)}
                              placeholder="—"
                              className={[
                                'w-16 text-center text-sm rounded border px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500',
                                !canEdit ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white border-gray-300',
                                isDirty && canEdit ? 'ring-2 ring-blue-400 border-blue-400' : '',
                              ].join(' ')}
                            />
                          </td>
                          {/* A — live (server + unsaved M cumulative) */}
                          <td className={`px-2 py-3 text-center text-sm font-medium border-b border-gray-100 ${liveA === 0 ? 'text-gray-400' : liveA !== cell.A ? 'text-blue-600' : 'text-green-700'}`}>
                            {liveA}
                          </td>
                        </Fragment>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {blocker.state === 'blocked' && (
        <ConfirmDialog
          title="Leave without saving?"
          description="You have unsaved inventory changes. If you leave now, your forecast entries will be lost."
          confirmLabel="Leave"
          onConfirm={() => blocker.proceed()}
          onCancel={() => blocker.reset()}
        />
      )}
    </div>
  )
}

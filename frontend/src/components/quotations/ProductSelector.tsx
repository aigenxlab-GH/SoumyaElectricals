import { useState } from 'react'
import { useActiveProducts } from '../../hooks/useProducts'
import { useInventory } from '../../hooks/useInventory'
import { LoadingSpinner } from '../../common/LoadingSpinner'
import type { Product } from '@soumya/shared'

interface Props {
  alreadyAddedIds: string[]
  deliveryDate: string
  onSelect: (product: Product) => void
  onClose: () => void
}

export function ProductSelector({ alreadyAddedIds, deliveryDate, onSelect, onClose }: Props) {
  const { data: products = [], isLoading: loadingProducts } = useActiveProducts()
  const { data: inventoryRows = [], isLoading: loadingInv } = useInventory()
  const [search, setSearch] = useState('')

  // Build product_id → A (projected available) for the Monday-of-week that
  // contains the chosen delivery_date. If the delivery falls past the visible
  // 8-week window, fall back to the last visible week's A as a defensive value.
  const availMap: Record<string, number> = {}
  const d = new Date(`${deliveryDate}T12:00:00`)
  const day = d.getDay()
  const daysBack = day === 1 ? 0 : day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - daysBack)
  const y  = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const deliveryMonday = `${y}-${mm}-${dd}`

  for (const row of inventoryRows) {
    const match = row.weeks.find((w) => w.monday === deliveryMonday)
    const fallback = row.weeks[row.weeks.length - 1]?.A ?? 0
    availMap[row.product_id] = match ? match.A : fallback
  }

  const isLoading = loadingProducts || loadingInv

  const filtered = products.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.product_code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl flex flex-col max-h-[80vh]">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Select Product</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="px-5 py-3 border-b border-gray-100">
          <input
            type="text"
            placeholder="Search by name or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="overflow-y-auto overflow-x-auto flex-1">
          {isLoading ? (
            <div className="p-6"><LoadingSpinner /></div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No active products found.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Code</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Selling Price</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Available</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((product) => {
                  const added = alreadyAddedIds.includes(product.id)
                  const available = availMap[product.id] ?? 0
                  const outOfStock = available === 0
                  const blocked = added || outOfStock
                  return (
                    <tr
                      key={product.id}
                      onClick={() => !blocked && onSelect(product)}
                      className={blocked ? 'opacity-40 cursor-not-allowed' : 'hover:bg-blue-50 cursor-pointer'}
                    >
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{product.product_code}</td>
                      <td className="px-4 py-2.5 text-gray-900">
                        {product.name}
                        {added && <span className="ml-2 text-xs text-gray-400">(already added)</span>}
                        {!added && outOfStock && <span className="ml-2 text-xs text-red-400">(out of stock)</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-700">₹{Number(product.selling_price).toFixed(2)}</td>
                      <td className={`px-4 py-2.5 text-right font-medium ${available === 0 ? 'text-red-500' : available <= 5 ? 'text-amber-600' : 'text-green-700'}`}>
                        {available}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

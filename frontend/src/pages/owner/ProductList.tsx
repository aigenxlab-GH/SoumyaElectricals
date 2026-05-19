import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LoadingSpinner } from '../../common/LoadingSpinner'
import { EmptyState } from '../../common/EmptyState'
import { ConfirmDialog } from '../../common/ConfirmDialog'
import { useProducts, useToggleProductStatus } from '../../hooks/useProducts'
import { parseApiError } from '../../utils/api-error'
import type { Product } from '@soumya/shared'

type StatusFilter = 'all' | 'active' | 'inactive'

const chip = (active: boolean) =>
  `px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
    active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
  }`

export default function ProductList() {
  const { data: products = [], isLoading } = useProducts()
  const toggleStatus = useToggleProductStatus()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [confirmProduct, setConfirmProduct] = useState<Product | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [sort, setSort] = useState<{ col: keyof Product; dir: 'asc' | 'desc' }>({ col: 'product_code', dir: 'asc' })

  const filtered = useMemo(() => {
    let list = products
    if (statusFilter !== 'all') list = list.filter((p) => p.status === statusFilter)
    return [...list].sort((a, b) => {
      const av = a[sort.col] ?? ''
      const bv = b[sort.col] ?? ''
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [products, statusFilter, sort])

  function handleSort(col: keyof Product) {
    setSort((prev) => ({ col, dir: prev.col === col && prev.dir === 'asc' ? 'desc' : 'asc' }))
  }

  function SortIcon({ col }: { col: keyof Product }) {
    if (sort.col !== col) return <span className="ml-1 text-gray-300">↕</span>
    return <span className="ml-1 text-blue-600">{sort.dir === 'asc' ? '↑' : '↓'}</span>
  }

  function handleToggle(product: Product) {
    setServerError(null)
    setConfirmProduct(product)
  }

  function confirmToggle() {
    if (!confirmProduct) return
    const newStatus = confirmProduct.status === 'active' ? 'inactive' : 'active'
    toggleStatus.mutate(
      { id: confirmProduct.id, dto: { status: newStatus } },
      {
        onSuccess: () => setConfirmProduct(null),
        onError: (err) => {
          setServerError(parseApiError(err))
          setConfirmProduct(null)
        },
      }
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Products</h1>
        <Link to="/owner/products/new" className="text-sm px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          + Add Product
        </Link>
      </div>

      {serverError && (
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          <span>⚠ {serverError}</span>
          <button onClick={() => setServerError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Status filter chips */}
      <div className="flex items-center gap-2">
        {(['all', 'active', 'inactive'] as StatusFilter[]).map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={chip(statusFilter === s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <span className="ml-auto text-sm text-gray-500">{filtered.length} product{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6"><LoadingSpinner /></div>
        ) : filtered.length === 0 ? (
          <EmptyState message="No products found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    { key: 'product_code',  label: 'Product ID',    hideMobile: true  },
                    { key: 'name',          label: 'Product Name',  hideMobile: false },
                    { key: 'specification', label: 'Specification', hideMobile: true  },
                    { key: 'category',      label: 'Category',      hideMobile: true  },
                    { key: 'cost_price',    label: 'Cost Price',    hideMobile: true  },
                    { key: 'selling_price', label: 'Selling Price', hideMobile: false },
                    { key: 'status',        label: 'Status',        hideMobile: false },
                  ].map(({ key, label, hideMobile }) => (
                    <th
                      key={key}
                      onClick={() => handleSort(key as keyof Product)}
                      className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100${hideMobile ? ' hidden sm:table-cell' : ''}`}
                    >
                      {label}<SortIcon col={key as keyof Product} />
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 hidden sm:table-cell">{product.product_code}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{product.name}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs hidden sm:table-cell">
                      <span title={product.specification} className="block truncate">{product.specification}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{product.category}</td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">₹{Number(product.cost_price).toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-600">₹{Number(product.selling_price).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        product.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {product.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/owner/products/${product.id}/edit`}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleToggle(product)}
                          className={`text-sm ${product.status === 'active' ? 'text-red-600 hover:underline' : 'text-green-600 hover:underline'}`}
                        >
                          {product.status === 'active' ? 'Inactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmProduct && (
        <ConfirmDialog
          title={confirmProduct.status === 'active' ? 'Inactivate product?' : 'Activate product?'}
          description={
            confirmProduct.status === 'active'
              ? `This will inactivate "${confirmProduct.name}". It will no longer appear in new quotations.`
              : `This will reactivate "${confirmProduct.name}".`
          }
          confirmLabel={confirmProduct.status === 'active' ? 'Inactivate' : 'Activate'}
          isLoading={toggleStatus.isPending}
          onConfirm={confirmToggle}
          onCancel={() => setConfirmProduct(null)}
        />
      )}
    </div>
  )
}

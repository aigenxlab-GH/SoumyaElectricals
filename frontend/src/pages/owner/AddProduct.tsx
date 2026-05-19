import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateProductSchema } from '@soumya/shared'
import type { CreateProductDto } from '@soumya/shared'
import { useCreateProduct } from '../../hooks/useProducts'
import { parseApiError } from '../../utils/api-error'

const field = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const label = 'block text-sm font-medium text-gray-700 mb-1'

export default function AddProduct() {
  const navigate = useNavigate()
  const createProduct = useCreateProduct()
  const [serverError, setServerError] = useState<string | null>(null)
  const [createdCode, setCreatedCode] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<CreateProductDto>({
    resolver: zodResolver(CreateProductSchema),
    defaultValues: { category: 'Electrode' },
  })

  function onSubmit(dto: CreateProductDto) {
    setServerError(null)
    createProduct.mutate(dto, {
      onSuccess: (product) => {
        setCreatedCode(product.product_code)
        setTimeout(() => navigate('/owner/products'), 1500)
      },
      onError: (err) => setServerError(parseApiError(err)),
    })
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/owner/products')} className="text-sm text-gray-500 hover:text-gray-700">← Products</button>
        <h1 className="text-xl font-semibold text-gray-900">Add Product</h1>
      </div>

      {createdCode && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm">
          <span>✓ Product created — ID: <strong>{createdCode}</strong>. Redirecting…</span>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className={label}>Product ID</label>
            <input disabled value="Auto-generated on save" className={`${field} bg-gray-50 text-gray-400`} readOnly />
          </div>

          <div>
            <label className={label}>Product Name <span className="text-red-500">*</span></label>
            <input type="text" {...register('name')} className={field} placeholder="e.g. Electrode 3.15mm — Rutile Grade" />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label className={label}>Specification <span className="text-red-500">*</span></label>
            <textarea {...register('specification')} rows={3} className={field} placeholder="Describe the product specification…" />
            {errors.specification && <p className="mt-1 text-xs text-red-600">{errors.specification.message}</p>}
          </div>

          <div>
            <label className={label}>Category <span className="text-red-500">*</span></label>
            <select {...register('category')} className={field}>
              <option value="Electrode">Electrode</option>
            </select>
            {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>Cost Price (₹) <span className="text-red-500">*</span></label>
              <input type="number" step="0.01" min="0.01" {...register('cost_price', { valueAsNumber: true })} className={field} />
              {errors.cost_price && <p className="mt-1 text-xs text-red-600">{errors.cost_price.message}</p>}
            </div>
            <div>
              <label className={label}>Selling Price (₹) <span className="text-red-500">*</span></label>
              <input type="number" step="0.01" min="0.01" {...register('selling_price', { valueAsNumber: true })} className={field} />
              {errors.selling_price && <p className="mt-1 text-xs text-red-600">{errors.selling_price.message}</p>}
            </div>
          </div>

          {serverError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{serverError}</div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => navigate('/owner/products')} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={createProduct.isPending || !isDirty}
              title={!isDirty ? 'No changes to save' : undefined}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {createProduct.isPending ? 'Saving…' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

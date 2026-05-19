import { useState, useEffect } from 'react'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateQuotationSchema } from '@soumya/shared'
import type { CreateQuotationDto, QuotationDetail, Product } from '@soumya/shared'
import { ProductSelector } from './ProductSelector'
import { TotalsFooter } from './TotalsFooter'
import { useAuthStore } from '../../store/auth.store'
import { useSystemConfig } from '../../hooks/useConfig'
import { useInventory } from '../../hooks/useInventory'

const field = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const label = 'block text-sm font-medium text-gray-700 mb-1'
const disabledField = `${field} bg-gray-50 text-gray-500 cursor-not-allowed`
const todayISO = () => new Date().toISOString().split('T')[0]

interface Props {
  mode: 'create' | 'edit'
  existing?: QuotationDetail
  onSaveDraft: (dto: CreateQuotationDto) => void
  onSubmitForApproval?: (dto: CreateQuotationDto) => void
  onSelfApprove?: (dto: CreateQuotationDto) => void
  onSelfReject?: (dto: CreateQuotationDto) => void
  onCancel: () => void
  isPending: boolean
  serverError?: string | null
}

export function QuotationForm({ existing, onSaveDraft, onSubmitForApproval, onSelfApprove, onSelfReject, onCancel, isPending, serverError }: Props) {
  const { user } = useAuthStore()
  const { data: sysConfig } = useSystemConfig()
  const gstPct = sysConfig?.gst_pct ?? 18

  const { data: inventoryRows = [] } = useInventory()

  // Map product_id → quantity already reserved by THIS quotation (edit mode only).
  // When editing a draft, those units are still counted as reserved in A — but
  // they're "owned" by this quotation and effectively available to it.
  const ownReservedMap: Record<string, number> = {}
  if (existing && existing.status !== 'rejected' && existing.status !== 'cancelled') {
    for (const i of existing.items) {
      if (i.product_id) ownReservedMap[i.product_id] = (ownReservedMap[i.product_id] ?? 0) + i.quantity
    }
  }

  const [showProductSelector, setShowProductSelector] = useState(false)
  const [sameAddress, setSameAddress] = useState(false)
  const [pendingAction, setPendingAction] = useState<'draft' | 'submit' | 'self-approve' | 'self-reject'>('draft')

  // Maps product_id (UUID) → product_code (e.g. Product-001) for display only
  const [productCodeMap, setProductCodeMap] = useState<Record<string, string>>(() => {
    if (!existing) return {}
    const map: Record<string, string> = {}
    for (const item of existing.items) {
      if (item.product_id && item.product_code) map[item.product_id] = item.product_code
    }
    return map
  })

  const { register, control, handleSubmit, setValue, formState: { errors, isDirty } } = useForm<CreateQuotationDto>({
    resolver: zodResolver(CreateQuotationSchema),
    defaultValues: existing ? {
      client_name: existing.client_name,
      client_phone: existing.client_phone,
      client_email: existing.client_email,
      address: existing.address,
      delivery_address: existing.delivery_address,
      delivery_date: existing.delivery_date,
      discount_pct: existing.discount_pct,
      gst_pct: existing.gst_pct,
      subtotal: existing.subtotal,
      discount_amount: existing.discount_amount,
      amount_after_discount: existing.amount_after_discount,
      gst_amount: existing.gst_amount,
      final_amount: existing.final_amount,
      items: existing.items.map((i) => ({
        product_id: i.product_id ?? '',
        product_name_snapshot: i.product_name_snapshot,
        selling_price_snapshot: i.selling_price_snapshot,
        quantity: i.quantity,
        total_price: i.total_price,
      })),
    } : {
      discount_pct: 0,
      gst_pct: gstPct,
      items: [],
      delivery_date: '',
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchedItems = useWatch({ control, name: 'items' }) ?? []
  const watchedDiscount = useWatch({ control, name: 'discount_pct' }) ?? 0
  const watchedAddress = useWatch({ control, name: 'address' }) ?? ''
  const watchedDeliveryDate = useWatch({ control, name: 'delivery_date' }) ?? ''

  // Map product_id → A (projected available) for the week containing the
  // currently-selected delivery_date. Falls back to last-visible-week A if
  // delivery_date is outside the visible window, or null if no date picked yet.
  const availMap: Record<string, number | null> = {}
  if (watchedDeliveryDate) {
    // Compute the Monday-of-week for the delivery_date (local)
    const d = new Date(`${watchedDeliveryDate}T12:00:00`)
    const day = d.getDay()
    const daysBack = day === 1 ? 0 : day === 0 ? 6 : day - 1
    d.setDate(d.getDate() - daysBack)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const deliveryMonday = `${y}-${m}-${dd}`
    for (const row of inventoryRows) {
      const match = row.weeks.find((w) => w.monday === deliveryMonday)
      const fallback = row.weeks[row.weeks.length - 1]?.A ?? 0
      availMap[row.product_id] = match ? match.A : fallback
    }
  } else {
    for (const row of inventoryRows) availMap[row.product_id] = null
  }

  // Live totals
  const subtotal = watchedItems.reduce((sum, item) => sum + (Number(item.selling_price_snapshot) * Number(item.quantity) || 0), 0)
  const discountAmount = subtotal * (Number(watchedDiscount) / 100)
  const afterDiscount = subtotal - discountAmount
  const gstAmount = afterDiscount * (gstPct / 100)
  const finalAmount = afterDiscount + gstAmount

  // Keep totals in form values
  useEffect(() => {
    setValue('subtotal', parseFloat(subtotal.toFixed(2)))
    setValue('discount_amount', parseFloat(discountAmount.toFixed(2)))
    setValue('amount_after_discount', parseFloat(afterDiscount.toFixed(2)))
    setValue('gst_pct', gstPct)
    setValue('gst_amount', parseFloat(gstAmount.toFixed(2)))
    setValue('final_amount', parseFloat(finalAmount.toFixed(2)))
  }, [subtotal, discountAmount, afterDiscount, gstAmount, finalAmount, gstPct, setValue])

  // Same as address checkbox
  useEffect(() => {
    if (sameAddress) setValue('delivery_address', watchedAddress)
  }, [sameAddress, watchedAddress, setValue])

  function addProduct(product: Product) {
    append({
      product_id: product.id,
      product_name_snapshot: product.name,
      selling_price_snapshot: product.selling_price,
      quantity: 1,
      total_price: product.selling_price,
    })
    setProductCodeMap((prev) => ({ ...prev, [product.id]: product.product_code }))
    setShowProductSelector(false)
  }

  function updateQuantity(index: number, qty: number) {
    const price = watchedItems[index]?.selling_price_snapshot ?? 0
    setValue(`items.${index}.quantity`, qty)
    setValue(`items.${index}.total_price`, parseFloat((price * qty).toFixed(2)))
  }

  function submitWithAction(action: typeof pendingAction) {
    setPendingAction(action)
    handleSubmit((dto) => {
      if (action === 'draft') onSaveDraft(dto)
      else if (action === 'submit') onSubmitForApproval?.(dto)
      else if (action === 'self-approve') onSelfApprove?.(dto)
      else if (action === 'self-reject') onSelfReject?.(dto)
    })()
  }

  const addedProductIds = fields.map((f) => (f as { product_id: string }).product_id)

  return (
    <div className="space-y-6">
      {/* Created By */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Created By</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>Name</label>
            <input disabled value={user?.full_name ?? ''} className={disabledField} />
          </div>
          <div>
            <label className={label}>Employee ID</label>
            <input disabled value={user?.employee_id ?? ''} className={disabledField} />
          </div>
          <div>
            <label className={label}>Mobile</label>
            <input disabled value={user?.phone ?? '—'} className={disabledField} />
          </div>
          <div>
            <label className={label}>Email</label>
            <input disabled value={user?.email ?? '—'} className={disabledField} />
          </div>
        </div>
      </div>

      {/* Client Details */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Client Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>Client Name <span className="text-red-500">*</span></label>
            <input type="text" {...register('client_name')} className={field} />
            {errors.client_name && <p className="mt-1 text-xs text-red-600">{errors.client_name.message}</p>}
          </div>
          <div>
            <label className={label}>Phone (10 digits) <span className="text-red-500">*</span></label>
            <input type="text" maxLength={10} {...register('client_phone')} className={field} />
            {errors.client_phone && <p className="mt-1 text-xs text-red-600">{errors.client_phone.message}</p>}
          </div>
          <div className="col-span-2">
            <label className={label}>Email <span className="text-red-500">*</span></label>
            <input type="email" {...register('client_email')} className={field} />
            {errors.client_email && <p className="mt-1 text-xs text-red-600">{errors.client_email.message}</p>}
          </div>
          <div className="col-span-2">
            <label className={label}>Address <span className="text-red-500">*</span></label>
            <textarea {...register('address')} rows={2} className={field} />
            {errors.address && <p className="mt-1 text-xs text-red-600">{errors.address.message}</p>}
          </div>
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className={label + ' mb-0'}>Delivery Address <span className="text-red-500">*</span></label>
              <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                <input type="checkbox" checked={sameAddress} onChange={(e) => setSameAddress(e.target.checked)} className="rounded" />
                Same as Address
              </label>
            </div>
            <textarea {...register('delivery_address')} rows={2} disabled={sameAddress} className={sameAddress ? disabledField : field} />
            {errors.delivery_address && <p className="mt-1 text-xs text-red-600">{errors.delivery_address.message}</p>}
          </div>
          <div>
            <label className={label}>Date of Quotation</label>
            <input disabled value={existing?.quotation_date ?? todayISO()} className={disabledField} />
          </div>
          <div>
            <label className={label}>Date of Delivery <span className="text-red-500">*</span></label>
            <input type="date" min={todayISO()} autoComplete="off" {...register('delivery_date')} className={field} />
            {errors.delivery_date && <p className="mt-1 text-xs text-red-600">{errors.delivery_date.message}</p>}
          </div>
          <div>
            <label className={label}>Discount (%)</label>
            <input type="number" min={0} max={100} step={0.01} {...register('discount_pct', { valueAsNumber: true })} className={field} />
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Products</h2>
          <div className="flex items-center gap-2">
            {!watchedDeliveryDate && (
              <span className="text-xs text-amber-600">Pick delivery date to add products</span>
            )}
            <button
              type="button"
              onClick={() => setShowProductSelector(true)}
              disabled={!watchedDeliveryDate}
              className="text-sm px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              + Add Product
            </button>
          </div>
        </div>

        {errors.items && typeof errors.items === 'object' && 'message' in errors.items && (
          <p className="text-xs text-red-600">{(errors.items as { message: string }).message}</p>
        )}

        {fields.length === 0 ? (
          <p className="text-sm text-gray-400 italic py-4 text-center">No products added yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-2 text-left text-xs font-medium text-gray-500">Code</th>
                  <th className="pb-2 text-left text-xs font-medium text-gray-500">Product Name</th>
                  <th className="pb-2 text-right text-xs font-medium text-gray-500">Unit Price</th>
                  <th className="pb-2 text-center text-xs font-medium text-gray-500">Qty</th>
                  <th className="pb-2 text-right text-xs font-medium text-gray-500">Total</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {fields.map((field, idx) => {
                  const item = watchedItems[idx]
                  const unitPrice = Number(item?.selling_price_snapshot ?? 0)
                  const qty = Number(item?.quantity ?? 1)
                  const rowTotal = unitPrice * qty
                  const productId = (field as { product_id: string }).product_id
                  const baseA = availMap[productId]
                  const ownReserved = ownReservedMap[productId] ?? 0
                  // Effective ceiling: A in delivery week + qty this quotation already holds reserved
                  const effectiveMax = baseA === null ? null : baseA + ownReserved
                  const overStock = effectiveMax !== null && qty > effectiveMax
                  return (
                    <tr key={field.id} className={overStock ? 'bg-red-50' : ''}>
                      <td className="py-2 pr-3 font-mono text-xs text-gray-500">
                        <input type="hidden" {...register(`items.${idx}.product_id`)} />
                        <input type="hidden" {...register(`items.${idx}.product_name_snapshot`)} />
                        <input type="hidden" {...register(`items.${idx}.selling_price_snapshot`, { valueAsNumber: true })} />
                        <input type="hidden" {...register(`items.${idx}.total_price`, { valueAsNumber: true })} />
                        {productCodeMap[productId] ?? productId}
                      </td>
                      <td className="py-2 pr-3 text-gray-900">{item?.product_name_snapshot}</td>
                      <td className="py-2 pr-3 text-right text-gray-700">₹{unitPrice.toFixed(2)}</td>
                      <td className="py-2 pr-3 text-center">
                        <input
                          type="number" min={1} step={1}
                          value={qty}
                          onChange={(e) => updateQuantity(idx, parseInt(e.target.value, 10) || 1)}
                          className={`w-16 text-center border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 ${overStock ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-blue-500'}`}
                        />
                        {overStock && (
                          <p className="text-xs text-red-600 mt-0.5 whitespace-nowrap">Max: {effectiveMax}</p>
                        )}
                        {!watchedDeliveryDate && fields.length > 0 && (
                          <p className="text-xs text-amber-600 mt-0.5 whitespace-nowrap">Pick delivery date</p>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-right font-medium text-gray-800">₹{rowTotal.toFixed(2)}</td>
                      <td className="py-2 text-right">
                        <button type="button" onClick={() => remove(idx)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Totals */}
      {fields.length > 0 && (
        <TotalsFooter
          subtotal={subtotal}
          discountPct={Number(watchedDiscount)}
          discountAmount={discountAmount}
          amountAfterDiscount={afterDiscount}
          gstPct={gstPct}
          gstAmount={gstAmount}
          finalAmount={finalAmount}
        />
      )}

      {serverError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{serverError}</div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 justify-end pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
          Cancel
        </button>
        <button type="button" disabled={isPending || !isDirty}
          title={!isDirty ? 'No changes to save' : undefined}
          onClick={() => submitWithAction('draft')}
          className="px-4 py-2 text-sm text-white bg-gray-600 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">
          {isPending && pendingAction === 'draft' ? 'Saving…' : 'Save as Draft'}
        </button>
        {user?.role !== 'owner' && onSubmitForApproval && (
          <button type="button" disabled={isPending || !isDirty}
            title={!isDirty ? 'No changes to save' : undefined}
            onClick={() => submitWithAction('submit')}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {isPending && pendingAction === 'submit' ? 'Submitting…' : 'Request for Approval'}
          </button>
        )}
        {user?.role === 'owner' && onSelfApprove && (
          <button type="button" disabled={isPending || !isDirty}
            title={!isDirty ? 'No changes to save' : undefined}
            onClick={() => submitWithAction('self-approve')}
            className="px-4 py-2 text-sm text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {isPending && pendingAction === 'self-approve' ? 'Approving…' : 'Self-Approve'}
          </button>
        )}
        {user?.role === 'owner' && onSelfReject && (
          <button type="button" disabled={isPending || !isDirty}
            title={!isDirty ? 'No changes to save' : undefined}
            onClick={() => submitWithAction('self-reject')}
            className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {isPending && pendingAction === 'self-reject' ? 'Rejecting…' : 'Self-Reject'}
          </button>
        )}
      </div>

      {showProductSelector && (
        <ProductSelector
          alreadyAddedIds={addedProductIds}
          deliveryDate={watchedDeliveryDate}
          onSelect={addProduct}
          onClose={() => setShowProductSelector(false)}
        />
      )}
    </div>
  )
}

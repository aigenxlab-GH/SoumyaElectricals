import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuotation, useSubmitQuotation, useSelfApproveQuotation, useSelfRejectQuotation, useFinaliseQuotation, useCancelQuotation } from '../../hooks/useQuotations'
import { QuotationStatusBadge } from '../../components/quotations/QuotationStatusBadge'
import { TotalsFooter } from '../../components/quotations/TotalsFooter'
import { ConfirmDialog } from '../../common/ConfirmDialog'
import { LoadingSpinner } from '../../common/LoadingSpinner'
import { useAuthStore } from '../../store/auth.store'
import { parseApiError } from '../../utils/api-error'
import { useSystemConfig } from '../../hooks/useConfig'

const label = 'text-xs font-medium text-gray-500 uppercase tracking-wider'
const value = 'text-sm text-gray-900 mt-0.5'
const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
const fmtMoney = (n: number) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

export default function QuotationDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { data: quotation, isLoading } = useQuotation(id ?? '')
  const { data: config } = useSystemConfig()

  const submit = useSubmitQuotation()
  const selfApprove = useSelfApproveQuotation()
  const selfReject = useSelfRejectQuotation()
  const finalise = useFinaliseQuotation()
  const cancel = useCancelQuotation()

  const [confirmAction, setConfirmAction] = useState<{ action: string; label: string; description: string } | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)

  if (isLoading) return <div className="p-6"><LoadingSpinner /></div>
  if (!quotation) return <div className="p-6 text-gray-500">Quotation not found.</div>

  const isPending = submit.isPending || selfApprove.isPending || selfReject.isPending || finalise.isPending || cancel.isPending
  const isOwner = user?.role === 'owner'
  const isCreator = quotation.created_by === user?.id

  function executeAction(action: string) {
    if (!id) return
    setActionError(null)
    const mut =
      action === 'submit' ? submit :
      action === 'self-approve' ? selfApprove :
      action === 'self-reject' ? selfReject :
      action === 'finalise' ? finalise :
      cancel

    mut.mutate(id, {
      onSuccess: () => {
        setConfirmAction(null)
        if (action === 'finalise') {
          // Trigger PDF download after finalise
          triggerPdfDownload()
        }
      },
      onError: (err) => {
        setConfirmAction(null)
        setActionError(parseApiError(err))
      },
    })
  }

  async function triggerPdfDownload() {
    if (!quotation) return
    setPdfLoading(true)
    try {
      // Dynamic import to avoid bundle bloat if PDF not needed
      const { pdf } = await import('@react-pdf/renderer')
      const { QuotationPDF } = await import('../../components/quotations/QuotationPDF')
      const React = await import('react')
      const company = {
        brand_name:           config?.brand_name           ?? 'Soumya Earthing Electrodes',
        company_name:         config?.company_name         ?? 'Soumya Earthing Electrodes',
        company_address:      config?.company_address      ?? '',
        gstin_no:             config?.gstin_no             ?? '',
        company_email:        config?.company_email        ?? '',
        company_phone:        config?.company_phone        ?? '',
        company_website:      config?.company_website      ?? '',
        authorized_signatory: config?.authorized_signatory ?? '',
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = React.createElement(QuotationPDF, { quotation, company }) as any
      const blob = await pdf(doc).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${quotation.quotation_code}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setActionError('PDF generation failed. Please try again.')
    } finally {
      setPdfLoading(false)
    }
  }

  async function handleDownloadPdf() {
    await triggerPdfDownload()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/quotations')} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-gray-900 font-mono">{quotation.quotation_code}</h1>
              <QuotationStatusBadge status={quotation.status} large />
            </div>
            <p className="text-sm text-gray-500 mt-0.5">Date: {fmt(quotation.quotation_date)}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Edit — creator, draft/rejected */}
          {isCreator && (quotation.status === 'draft' || quotation.status === 'rejected') && (
            <Link to={`/quotations/${id}/edit`} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
              Edit
            </Link>
          )}

          {/* Request for Approval — creator, draft, non-owner */}
          {isCreator && quotation.status === 'draft' && !isOwner && (
            <button
              onClick={() => setConfirmAction({ action: 'submit', label: 'Request for Approval', description: 'Submit this quotation for manager approval?' })}
              className="px-3 py-1.5 text-sm text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              Request Approval
            </button>
          )}

          {/* Owner: Self-Approve / Self-Reject on own draft */}
          {isOwner && isCreator && quotation.status === 'draft' && (
            <>
              <button
                onClick={() => setConfirmAction({ action: 'self-approve', label: 'Self-Approve', description: 'Approve this quotation directly?' })}
                className="px-3 py-1.5 text-sm text-white bg-green-600 rounded-md hover:bg-green-700"
              >
                Self-Approve
              </button>
              <button
                onClick={() => setConfirmAction({ action: 'self-reject', label: 'Self-Reject', description: 'Reject this quotation?' })}
                className="px-3 py-1.5 text-sm text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Self-Reject
              </button>
            </>
          )}

          {/* Finalise — approved */}
          {quotation.status === 'approved' && (
            <button
              onClick={() => setConfirmAction({ action: 'finalise', label: 'Finalise', description: 'This will finalise the quotation, consume inventory, and download the PDF. This cannot be undone.' })}
              className="px-3 py-1.5 text-sm text-white bg-emerald-600 rounded-md hover:bg-emerald-700"
            >
              Finalise & Download PDF
            </button>
          )}

          {/* Cancel — creator, draft/rejected */}
          {isCreator && (quotation.status === 'draft' || quotation.status === 'rejected') && (
            <button
              onClick={() => setConfirmAction({ action: 'cancel', label: 'Cancel Quotation', description: 'This will cancel the quotation and release any reserved inventory. This cannot be undone.' })}
              className="px-3 py-1.5 text-sm text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              Cancel
            </button>
          )}

          {/* Download PDF — finalised */}
          {quotation.status === 'finalised' && (
            <button
              onClick={handleDownloadPdf}
              disabled={pdfLoading}
              className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {pdfLoading ? 'Generating…' : 'Download PDF'}
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 flex items-center justify-between">
          <span>⚠ {actionError}</span>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Meta: Created By / Approved By */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Created By</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><p className={label}>Name</p><p className={value}>{quotation.creator_name_snapshot}</p></div>
            <div><p className={label}>Employee ID</p><p className={`${value} font-mono`}>{quotation.creator_employee_id_snapshot}</p></div>
            {quotation.creator_mobile_snapshot && (
              <div><p className={label}>Mobile</p><p className={value}>{quotation.creator_mobile_snapshot}</p></div>
            )}
            {quotation.creator_email_snapshot && (
              <div><p className={label}>Email</p><p className={value}>{quotation.creator_email_snapshot}</p></div>
            )}
            <div><p className={label}>Created On</p><p className={value}>{fmt(quotation.created_at)}</p></div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Approval Info</h2>
          {quotation.approved_at ? (
            <div className="space-y-2">
              <div><p className={label}>Status</p><p className={value}><QuotationStatusBadge status={quotation.status} /></p></div>
              <div><p className={label}>Approved On</p><p className={value}>{fmt(quotation.approved_at)}</p></div>
            </div>
          ) : quotation.status === 'rejected' ? (
            <div className="space-y-3">
              <div><p className={label}>Status</p><p className={value}><QuotationStatusBadge status={quotation.status} /></p></div>
              {quotation.rejected_by_snapshot && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className={label}>Rejected By</p>
                    <p className={value}>{quotation.rejected_by_snapshot}</p>
                  </div>
                  <div>
                    <p className={label}>Employee ID</p>
                    <p className={`${value} font-mono`}>{quotation.rejected_by_employee_id_snapshot ?? '—'}</p>
                  </div>
                  {quotation.rejected_at && (
                    <div>
                      <p className={label}>Rejected On</p>
                      <p className={value}>{fmt(quotation.rejected_at)}</p>
                    </div>
                  )}
                </div>
              )}
              {quotation.rejection_reason && (
                <div>
                  <p className={label}>Rejection Reason</p>
                  <p className="text-sm text-red-700 mt-0.5 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                    {quotation.rejection_reason}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No approval action yet.</p>
          )}
        </div>
      </div>

      {/* Client Details */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Client Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div><p className={label}>Client Name</p><p className={value}>{quotation.client_name}</p></div>
          <div><p className={label}>Phone</p><p className={value}>{quotation.client_phone}</p></div>
          <div><p className={label}>Email</p><p className={value}>{quotation.client_email}</p></div>
          <div className="col-span-2 md:col-span-1"><p className={label}>Date of Quotation</p><p className={value}>{fmt(quotation.quotation_date)}</p></div>
          <div><p className={label}>Delivery Date</p><p className={value}>{fmt(quotation.delivery_date)}</p></div>
          <div className="col-span-2 md:col-span-3"><p className={label}>Billing Address</p><p className={`${value} whitespace-pre-line`}>{quotation.address}</p></div>
          <div className="col-span-2 md:col-span-3"><p className={label}>Delivery Address</p><p className={`${value} whitespace-pre-line`}>{quotation.delivery_address}</p></div>
        </div>
      </div>

      {/* Products */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Products</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pb-2 text-left text-xs font-medium text-gray-500">Code</th>
                <th className="pb-2 text-left text-xs font-medium text-gray-500">Product Name</th>
                <th className="pb-2 text-right text-xs font-medium text-gray-500">Unit Price</th>
                <th className="pb-2 text-center text-xs font-medium text-gray-500">Qty</th>
                <th className="pb-2 text-right text-xs font-medium text-gray-500">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {quotation.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-2 pr-3 font-mono text-xs text-gray-500">{item.product_code ?? '—'}</td>
                  <td className="py-2 pr-3 text-gray-900">{item.product_name_snapshot}</td>
                  <td className="py-2 pr-3 text-right text-gray-700">{fmtMoney(item.selling_price_snapshot)}</td>
                  <td className="py-2 pr-3 text-center text-gray-900">{item.quantity}</td>
                  <td className="py-2 text-right font-medium text-gray-800">{fmtMoney(item.total_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals */}
      <TotalsFooter
        subtotal={quotation.subtotal}
        discountPct={quotation.discount_pct}
        discountAmount={quotation.discount_amount}
        amountAfterDiscount={quotation.amount_after_discount}
        gstPct={quotation.gst_pct}
        gstAmount={quotation.gst_amount}
        finalAmount={quotation.final_amount}
      />

      {/* Confirm Dialog */}
      {confirmAction && (
        <ConfirmDialog
          title={`${confirmAction.label}?`}
          description={confirmAction.description}
          confirmLabel={confirmAction.label}
          isLoading={isPending}
          onConfirm={() => executeAction(confirmAction.action)}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  )
}

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LoadingSpinner } from '../../common/LoadingSpinner'
import { ConfirmDialog } from '../../common/ConfirmDialog'
import { usePayroll, useProcessPayroll, useGeneratePayroll, useDeletePayroll } from '../../hooks/usePayrolls'
import { useSystemConfig } from '../../hooks/useConfig'
import { parseApiError } from '../../utils/api-error'
import { formatDate } from '../../utils/date-utils'
import type { PayrollStatus } from '@soumya/shared'

const fmtMoney = (n: number) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function StatusBadge({ status }: { status: PayrollStatus }) {
  const m: Record<PayrollStatus, string> = {
    draft:     'bg-gray-100 text-gray-700',
    finalised: 'bg-blue-100 text-blue-700',
    paid:      'bg-emerald-100 text-emerald-700',
  }
  return <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${m[status]}`}>{status}</span>
}

function Row({ label, children, strong }: { label: string; children: React.ReactNode; strong?: boolean }) {
  return (
    <div className="py-2.5 flex items-center justify-between border-b border-slate-100 last:border-0">
      <dt className={`text-sm ${strong ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>{label}</dt>
      <dd className={`text-sm ${strong ? 'font-bold text-gray-900' : 'text-gray-700'}`}>{children}</dd>
    </div>
  )
}

export default function PayrollDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: payroll, isLoading } = usePayroll(id ?? '')
  const { data: config } = useSystemConfig()
  const process = useProcessPayroll()
  const regenerate = useGeneratePayroll()
  const remove = useDeletePayroll()
  const [pdfLoading, setPdfLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{ action: 'finalise' | 'mark-paid' | 'revert' | 'regenerate' | 'delete'; label: string; description: string } | null>(null)

  if (isLoading) return <div className="p-6"><LoadingSpinner /></div>
  if (!payroll) return <div className="p-6 text-gray-500">Payroll not found.</div>

  const isDraft     = payroll.status === 'draft'
  const isFinalised = payroll.status === 'finalised'
  const isPaid      = payroll.status === 'paid'
  const isPending = process.isPending || regenerate.isPending || remove.isPending

  function runConfirmed() {
    if (!confirm || !id || !payroll) return
    setActionError(null)
    const onError = (err: unknown) => { setActionError(parseApiError(err)); setConfirm(null) }
    const onSuccess = () => setConfirm(null)
    if (confirm.action === 'regenerate') {
      regenerate.mutate(
        { user_id: payroll.user_id, period_year: payroll.period_year, period_month: payroll.period_month },
        { onSuccess, onError }
      )
    } else if (confirm.action === 'delete') {
      remove.mutate(id, { onSuccess: () => navigate('/payroll'), onError })
    } else {
      process.mutate({ id, dto: { action: confirm.action } }, { onSuccess, onError })
    }
  }

  async function downloadPdf() {
    if (!payroll) return
    setPdfLoading(true)
    setActionError(null)
    try {
      const { pdf } = await import('@react-pdf/renderer')
      const { PayrollPDF } = await import('../../components/payroll/PayrollPDF')
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
      const doc = React.createElement(PayrollPDF, { payroll, company }) as any
      const blob = await pdf(doc).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Payslip-${payroll.employee_id_snapshot}-${payroll.period_year}-${String(payroll.period_month).padStart(2, '0')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setActionError('PDF generation failed. Please try again.')
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/payroll')} className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-md px-3 py-1.5 hover:bg-gray-50">← Back</button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Payslip — {MONTHS[payroll.period_month - 1]} {payroll.period_year}</h1>
            <p className="text-xs text-gray-500 font-mono mt-0.5">{payroll.employee_name_snapshot} · {payroll.employee_id_snapshot}</p>
          </div>
        </div>
        <StatusBadge status={payroll.status} />
      </div>

      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-center justify-between">
          <span>⚠ {actionError}</span>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Action bar */}
      <div className="flex flex-wrap gap-2">
        <button onClick={downloadPdf} disabled={pdfLoading}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
          {pdfLoading ? 'Generating PDF…' : 'Download PDF'}
        </button>
        <button
          onClick={() => setConfirm({ action: 'regenerate', label: 'Re-Generate', description: 'This will overwrite the saved values with a fresh computation from current attendance, leave and overtime data. Status will remain ' + payroll.status + '.' })}
          disabled={isPending}
          className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">
          Re-Generate
        </button>
        {isDraft && (
          <button
            onClick={() => setConfirm({ action: 'finalise', label: 'Finalise', description: 'Move this payroll to Finalised status. You can still re-generate after this.' })}
            disabled={isPending}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50">
            Finalise
          </button>
        )}
        {isFinalised && (
          <button
            onClick={() => setConfirm({ action: 'mark-paid', label: 'Mark as Paid', description: 'Mark this payroll as Paid. Use this after the salary has been disbursed.' })}
            disabled={isPending}
            className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50">
            Mark as Paid
          </button>
        )}
        {(isFinalised || isPaid) && (
          <button
            onClick={() => setConfirm({ action: 'revert', label: 'Revert to Draft', description: 'Move this payroll back to Draft. Use only if you need to correct something.' })}
            disabled={isPending}
            className="px-4 py-2 text-sm border border-amber-300 text-amber-700 rounded-md hover:bg-amber-50 disabled:opacity-50">
            Revert to Draft
          </button>
        )}
        {isDraft && (
          <button
            onClick={() => setConfirm({ action: 'delete', label: 'Delete', description: 'Permanently delete this draft payroll. You can re-generate it any time.' })}
            disabled={isPending}
            className="ml-auto px-4 py-2 text-sm border border-red-300 text-red-700 rounded-md hover:bg-red-50 disabled:opacity-50">
            Delete
          </button>
        )}
      </div>

      {/* Two-column summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Period & Employee</h2>
          <dl>
            <Row label="Period">{formatDate(payroll.period_start)} – {formatDate(payroll.period_end)}</Row>
            <Row label="Employee">{payroll.employee_name_snapshot}</Row>
            <Row label="Employee ID"><span className="font-mono">{payroll.employee_id_snapshot}</span></Row>
            <Row label="Role"><span className="capitalize">{payroll.employee_role_snapshot}</span></Row>
            <Row label="Date of Joining">{formatDate(payroll.employee_join_date_snapshot)}</Row>
          </dl>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Attendance</h2>
          <dl>
            <Row label="Working Days (full cycle)">{payroll.full_period_working_days}</Row>
            <Row label="Working Days (after joining)">{payroll.effective_working_days}</Row>
            <Row label="Present Days">{payroll.present_days}</Row>
            <Row label="Paid Leave Days">{payroll.paid_leave_days}</Row>
            <Row label="Unpaid Absent">{payroll.unpaid_absent_days}</Row>
            <Row label="Loss of Pay (from leave write-off)">{payroll.lop_from_writeoff_days}</Row>
            <Row label="Overtime Hours">{Number(payroll.overtime_hours).toFixed(1)}</Row>
          </dl>
        </div>
      </div>

      {/* Earnings + Deductions side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-800 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5">Earnings</div>
          <dl className="p-5">
            <Row label={`Earned Salary (${payroll.present_days + payroll.paid_leave_days} days × ${fmtMoney(payroll.per_day_rate)})`}>{fmtMoney(payroll.earned_salary)}</Row>
            <Row label={`Overtime (${Number(payroll.overtime_hours).toFixed(1)} hrs)`}>{fmtMoney(payroll.overtime_pay)}</Row>
            <Row label="Gross Pay" strong>{fmtMoney(payroll.gross_pay)}</Row>
          </dl>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-800 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5">Deductions</div>
          <dl className="p-5">
            <Row label={`Loss of Pay (${payroll.total_lop_days} days × ${fmtMoney(payroll.per_day_rate)})`}>{fmtMoney(payroll.lop_deduction)}</Row>
            <Row label="Total Deductions" strong>{fmtMoney(payroll.lop_deduction)}</Row>
          </dl>
        </div>
      </div>

      {/* Net pay banner */}
      <div className="bg-slate-800 text-white rounded-xl px-6 py-4 flex items-center justify-between">
        <span className="text-sm font-bold uppercase tracking-widest">Net Pay</span>
        <span className="text-2xl font-bold">{fmtMoney(payroll.net_pay)}</span>
      </div>

      {/* Audit footer */}
      <div className="text-xs text-gray-400 flex flex-wrap gap-x-6">
        <span>Generated: {formatDate(payroll.generated_at)}</span>
        {payroll.finalised_at && <span>Finalised: {formatDate(payroll.finalised_at)}</span>}
        {payroll.paid_at && <span>Paid: {formatDate(payroll.paid_at)}</span>}
        <span>Last updated: {formatDate(payroll.updated_at)}</span>
      </div>

      {confirm && (
        <ConfirmDialog
          title={`${confirm.label}?`}
          description={confirm.description}
          confirmLabel={confirm.label}
          isLoading={isPending}
          onConfirm={runConfirmed}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}

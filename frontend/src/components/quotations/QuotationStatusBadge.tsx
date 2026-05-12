import type { QuotationStatus } from '@soumya/shared'

const cfg: Record<QuotationStatus, { label: string; cls: string }> = {
  draft:     { label: 'Draft',     cls: 'bg-gray-100 text-gray-700' },
  requested: { label: 'Requested', cls: 'bg-yellow-100 text-yellow-800' },
  approved:  { label: 'Approved',  cls: 'bg-blue-100 text-blue-800' },
  rejected:  { label: 'Rejected',  cls: 'bg-red-100 text-red-800' },
  finalised: { label: 'Finalised', cls: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-600' },
}

export function QuotationStatusBadge({ status, large }: { status: QuotationStatus; large?: boolean }) {
  const { label, cls } = cfg[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${large ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'} ${cls}`}>
      {label}
    </span>
  )
}

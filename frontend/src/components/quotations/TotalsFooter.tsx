interface Props {
  subtotal: number
  discountPct: number
  discountAmount: number
  amountAfterDiscount: number
  gstPct: number
  gstAmount: number
  finalAmount: number
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between items-center py-1.5 ${bold ? 'border-t-2 border-gray-300 mt-1 pt-2' : ''}`}>
      <span className={`text-sm ${bold ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>{label}</span>
      <span className={`text-sm ${bold ? 'font-semibold text-gray-900 text-base' : 'text-gray-800'}`}>{value}</span>
    </div>
  )
}

export function TotalsFooter({ subtotal, discountPct, discountAmount, amountAfterDiscount, gstPct, gstAmount, finalAmount }: Props) {
  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 w-full max-w-sm ml-auto space-y-0.5">
      <Row label="Subtotal" value={fmt(subtotal)} />
      {discountPct > 0 && <Row label={`Discount (${discountPct}%)`} value={`− ${fmt(discountAmount)}`} />}
      {discountPct > 0 && <Row label="Amount After Discount" value={fmt(amountAfterDiscount)} />}
      <Row label={`GST (${gstPct}%)`} value={`+ ${fmt(gstAmount)}`} />
      <Row label="Final Amount" value={fmt(finalAmount)} bold />
    </div>
  )
}

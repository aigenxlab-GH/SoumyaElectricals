import type { LeaveBalance } from '@soumya/shared'

interface Props {
  balance: LeaveBalance
  monthlyCredit?: number   // leaves credited on the 1st of each month
}

export function LeaveBalanceWidget({ balance, monthlyCredit }: Props) {
  const { total_credited, used, remaining } = balance
  const usedPct = total_credited > 0 ? Math.round((used / total_credited) * 100) : 0

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">Leave Balance</h3>
        {monthlyCredit !== undefined && (
          <span className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-2.5 py-0.5">
            +{monthlyCredit} credited on 1st of every month
          </span>
        )}
      </div>
      <div className="flex gap-8 mb-3">
        <div>
          <p className="text-xs text-gray-500">Credited</p>
          <p className="text-2xl font-semibold text-gray-900">{total_credited}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Used</p>
          <p className="text-2xl font-semibold text-orange-600">{used}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Remaining</p>
          <p className="text-2xl font-semibold text-green-600">{remaining}</p>
        </div>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className="bg-orange-400 h-2 rounded-full transition-all" style={{ width: `${usedPct}%` }} />
      </div>
      <p className="text-xs text-gray-400 mt-1">{usedPct}% used</p>
    </div>
  )
}

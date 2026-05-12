import { Link } from 'react-router-dom'
import { LoadingSpinner } from '../../common/LoadingSpinner'
import { useDashboard } from '../../hooks/useDashboard'
import { useSystemConfig } from '../../hooks/useConfig'
import { useAuthStore } from '../../store/auth.store'

interface EmployeeStats {
  timecards_this_month: number
  leaves_this_month: number
  leave_balance_remaining: number
}

interface ManagerStats {
  pending_timecards: number
  pending_leaves: number
  leave_balance_remaining: number
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  )
}

function LinkStatCard({ label, value, to }: { label: string; value: number; to: string }) {
  return (
    <Link to={to} className="block bg-white border border-gray-200 rounded-lg p-6 hover:shadow-sm hover:border-blue-300 transition-all">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-4xl font-bold mt-2 text-blue-600">{value}</p>
      <p className="text-xs text-gray-400 mt-3">Click to view →</p>
    </Link>
  )
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const { data, isLoading } = useDashboard()
  const { data: sysConfig } = useSystemConfig()

  if (isLoading) return <LoadingSpinner />

  // Manager view — pending approval counts with links
  if (user?.role === 'manager') {
    const stats = data as ManagerStats | undefined
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <LinkStatCard
            label="Pending Timecards"
            value={stats?.pending_timecards ?? 0}
            to="/approvals/timecards"
          />
          <LinkStatCard
            label="Pending Leaves"
            value={stats?.pending_leaves ?? 0}
            to="/approvals/leaves"
          />
          <StatCard label="Leave Balance Remaining" value={stats?.leave_balance_remaining ?? 0} color="text-green-600" />
        </div>
      </div>
    )
  }

  // Employee view — personal stats
  const stats = data as EmployeeStats | undefined
  const monthlyCredit = sysConfig ? Math.floor(sysConfig.annual_leave_days / 12) : 0

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Timecards This Month" value={stats?.timecards_this_month ?? 0} color="text-blue-600" />
        <StatCard label="Monthly Leave Credited" value={monthlyCredit} color="text-orange-600" />
        <StatCard label="Leave Balance Remaining" value={stats?.leave_balance_remaining ?? 0} color="text-green-600" />
      </div>
    </div>
  )
}

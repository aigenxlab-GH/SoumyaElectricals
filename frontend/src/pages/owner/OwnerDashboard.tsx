import { Link } from 'react-router-dom'
import { LoadingSpinner } from '../../common/LoadingSpinner'
import { useDashboard } from '../../hooks/useDashboard'
import { useProducts } from '../../hooks/useProducts'
import { useInventory } from '../../hooks/useInventory'
import { useQuotations } from '../../hooks/useQuotations'
import { useUsers } from '../../hooks/useUsers'

interface OwnerStats {
  pending_timecards: number
  pending_leaves: number
}

type Accent = 'blue' | 'emerald' | 'amber' | 'red' | 'indigo' | 'purple' | 'gray' | 'orange'

const accentMap: Record<Accent, { text: string; border: string; bg: string }> = {
  blue:    { text: 'text-blue-600',    border: 'hover:border-blue-300',    bg: 'bg-blue-50' },
  emerald: { text: 'text-emerald-600', border: 'hover:border-emerald-300', bg: 'bg-emerald-50' },
  amber:   { text: 'text-amber-600',   border: 'hover:border-amber-300',   bg: 'bg-amber-50' },
  red:     { text: 'text-red-600',     border: 'hover:border-red-300',     bg: 'bg-red-50' },
  indigo:  { text: 'text-indigo-600',  border: 'hover:border-indigo-300',  bg: 'bg-indigo-50' },
  purple:  { text: 'text-purple-600',  border: 'hover:border-purple-300',  bg: 'bg-purple-50' },
  gray:    { text: 'text-gray-600',    border: 'hover:border-gray-300',    bg: 'bg-gray-50' },
  orange:  { text: 'text-orange-600',  border: 'hover:border-orange-300',  bg: 'bg-orange-50' },
}

function Tile({
  label, value, to, accent = 'gray', icon, alert,
}: {
  label: string
  value: number | string
  to: string
  accent?: Accent
  icon: string
  alert?: boolean
}) {
  const c = accentMap[accent]
  return (
    <Link
      to={to}
      className={`bg-white border rounded-lg px-3 py-2.5 flex items-center gap-3 transition-all hover:shadow-md ${c.border} ${alert ? 'border-red-300' : 'border-gray-200'}`}
    >
      <div className={`w-8 h-8 rounded-md ${c.bg} flex items-center justify-center text-base flex-shrink-0`}>{icon}</div>
      <div className="min-w-0">
        <p className={`text-xl font-bold ${c.text} leading-tight`}>{value}</p>
        <p className="text-xs text-gray-600 leading-tight truncate">{label}</p>
      </div>
    </Link>
  )
}

export default function OwnerDashboard() {
  const { data, isLoading: dashLoading } = useDashboard()
  const { data: products = [], isLoading: productsLoading } = useProducts()
  const { data: inventoryRows = [], isLoading: invLoading } = useInventory()
  const { data: users = [], isLoading: usersLoading } = useUsers()

  const { data: draftRes,     isLoading: q1 } = useQuotations({ status: 'draft',     limit: 1, offset: 0 })
  const { data: requestedRes, isLoading: q2 } = useQuotations({ status: 'requested', limit: 1, offset: 0 })
  const { data: approvedRes,  isLoading: q3 } = useQuotations({ status: 'approved',  limit: 1, offset: 0 })

  const isLoading = dashLoading || productsLoading || invLoading || usersLoading || q1 || q2 || q3
  if (isLoading) return <LoadingSpinner />

  const stats = data as OwnerStats | undefined

  const activeProducts = products.filter((p) => p.status === 'active').length
  const lowStockCount  = inventoryRows.filter((r) => (r.weeks[0]?.A ?? 0) === 0).length
  const activeUsers    = users.filter((u) => u.is_active).length

  const pendingTimecards = stats?.pending_timecards ?? 0
  const pendingLeaves    = stats?.pending_leaves    ?? 0
  const requestedCount   = requestedRes?.total      ?? 0
  const draftCount       = draftRes?.total          ?? 0
  const approvedCount    = approvedRes?.total       ?? 0

  const hasActions = pendingTimecards + pendingLeaves + requestedCount > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
      </div>

      {/* Action Items — only show if something needs attention */}
      {hasActions && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Needs Action</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {pendingTimecards > 0 && (
              <Tile label="Pending Timecards" value={pendingTimecards} to="/owner/approvals/timecards" accent="blue" icon="🕐" alert />
            )}
            {pendingLeaves > 0 && (
              <Tile label="Pending Leaves" value={pendingLeaves} to="/owner/approvals/leaves" accent="orange" icon="🌿" alert />
            )}
            {requestedCount > 0 && (
              <Tile label="Pending Quotations" value={requestedCount} to="/quotations?queue=pending" accent="amber" icon="📋" alert />
            )}
          </div>
        </section>
      )}

      {/* Overview */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Overview</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Tile label="Active Products" value={activeProducts} to="/owner/products" accent="indigo" icon="📦" />
          <Tile label="Low / Zero Stock (this week)" value={lowStockCount} to="/inventory" accent={lowStockCount > 0 ? 'red' : 'emerald'} icon={lowStockCount > 0 ? '⚠️' : '✅'} />
          <Tile label="Draft Quotations" value={draftCount} to="/quotations" accent="gray" icon="✏️" />
          <Tile label="Approved Quotations" value={approvedCount} to="/quotations" accent="emerald" icon="✔️" />
          <Tile label="Active Users" value={activeUsers} to="/owner/users" accent="purple" icon="👥" />
        </div>
      </section>
    </div>
  )
}

import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'
import { useMyManager } from '../hooks/useUsers'
import { formatDate } from '../utils/date-utils'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 border-b border-slate-100 last:border-0">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900 sm:col-span-2 sm:mt-0">{children || <span className="text-slate-400">—</span>}</dd>
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const cls =
    role === 'owner'   ? 'bg-purple-100 text-purple-700' :
    role === 'manager' ? 'bg-blue-100 text-blue-700' :
                         'bg-gray-100 text-gray-700'
  return <span className={`px-2.5 py-0.5 rounded text-xs font-semibold capitalize ${cls}`}>{role}</span>
}

export default function Profile() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { data: manager } = useMyManager()

  if (!user) return null

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors"
        >
          ← Back
        </button>
        <h1 className="text-xl font-semibold text-slate-900">My Profile</h1>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <dl>
          <Row label="Full Name">{user.full_name}</Row>
          <Row label="Employee ID"><span className="font-mono">{user.employee_id}</span></Row>
          <Row label="Role"><RoleBadge role={user.role} /></Row>
          <Row label="Gender"><span className="capitalize">{user.sex}</span></Row>
          <Row label="Date of Birth">{formatDate(user.date_of_birth)}</Row>
          <Row label="Date of Joining">{formatDate(user.date_of_joining)}</Row>
          <Row label="Mobile Number">{user.phone}</Row>
          <Row label="Email">{user.email ? <a href={`mailto:${user.email}`} className="text-blue-600 hover:underline">{user.email}</a> : null}</Row>
          <Row label="Address"><span className="whitespace-pre-wrap">{user.address}</span></Row>
          <Row label="Reports To">{manager ? `${manager.full_name} (${manager.employee_id})` : user.role === 'owner' ? <span className="italic text-slate-400">No manager — top of hierarchy</span> : null}</Row>
          <Row label="Account Status">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {user.is_active ? 'Active' : 'Inactive'}
            </span>
          </Row>
        </dl>
      </div>

      <p className="text-xs text-slate-400">To change any of these details, please contact your administrator.</p>
    </div>
  )
}

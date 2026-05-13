import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'
import { useMyManager } from '../hooks/useUsers'
import { formatDate } from '../utils/date-utils'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900 sm:col-span-2 sm:mt-0">{children}</dd>
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const cls =
    role === 'owner'   ? 'bg-purple-100 text-purple-700' :
    role === 'manager' ? 'bg-blue-100 text-blue-700' :
                         'bg-gray-100 text-gray-700'
  return (
    <span className={`px-2.5 py-0.5 rounded text-xs font-semibold capitalize ${cls}`}>{role}</span>
  )
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
          className="flex items-center gap-1.5 text-sm font-medium text-slate-600
            hover:text-slate-900 border border-slate-300 rounded-lg px-3 py-1.5
            hover:bg-slate-50 transition-colors"
        >
          ← Back
        </button>
        <h1 className="text-xl font-semibold text-gray-900">My Profile</h1>
      </div>

      {/* Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {/* Top accent bar + avatar row */}
        <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600" />
        <div className="px-6 py-5 flex items-center gap-4 border-b border-slate-100">
          <div className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-100 to-indigo-200
            flex items-center justify-center text-xl font-bold text-blue-700 select-none shrink-0">
            {(user.full_name ?? user.employee_id ?? '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900">{user.full_name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100
                px-2 py-0.5 rounded">{user.employee_id}</span>
              <RoleBadge role={user.role} />
              <span className={`px-2 py-0.5 rounded text-xs font-semibold
                ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {user.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Details grid */}
        <dl className="divide-y divide-slate-100 px-6">
          <Field label="Full Name">{user.full_name}</Field>
          <Field label="Employee ID">
            <span className="font-mono text-xs font-semibold bg-slate-100 px-2 py-0.5 rounded">
              {user.employee_id}
            </span>
          </Field>
          <Field label="Role"><RoleBadge role={user.role} /></Field>
          <Field label="Gender"><span className="capitalize">{user.sex}</span></Field>
          <Field label="Date of Birth">{formatDate(user.date_of_birth)}</Field>
          <Field label="Date of Joining">{formatDate(user.date_of_joining)}</Field>
          <Field label="Mobile Number">
            {user.phone
              ? <span className="font-mono">{user.phone}</span>
              : <span className="text-slate-400">—</span>}
          </Field>
          <Field label="Email">
            {user.email
              ? <a href={`mailto:${user.email}`} className="text-blue-600 hover:underline">{user.email}</a>
              : <span className="text-slate-400">—</span>}
          </Field>
          <Field label="Address">
            {user.address
              ? <span className="whitespace-pre-line">{user.address}</span>
              : <span className="text-slate-400">—</span>}
          </Field>
          <Field label="Reports To">
            {manager ? (
              <span>
                {manager.full_name}
                <span className="text-slate-400 text-xs ml-1.5 font-mono">({manager.employee_id})</span>
              </span>
            ) : user.role === 'owner' ? (
              <span className="italic text-slate-400">No manager — top of hierarchy</span>
            ) : (
              <span className="text-slate-400">—</span>
            )}
          </Field>
          <Field label="Account Status">
            <span className={`px-2.5 py-0.5 rounded text-xs font-semibold
              ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {user.is_active ? 'Active — can log in' : 'Inactive — login blocked'}
            </span>
          </Field>
          <Field label="Member Since">{formatDate(user.created_at)}</Field>
        </dl>

        {/* Footer — back button */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2 text-sm font-semibold text-white rounded-lg
              bg-gradient-to-br from-slate-600 to-slate-800
              hover:from-slate-700 hover:to-slate-900
              shadow-[0_2px_6px_rgba(0,0,0,0.2)]
              hover:-translate-y-px transition-all duration-150"
          >
            ← Back
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-400">To change any of these details, please contact your administrator.</p>
    </div>
  )
}

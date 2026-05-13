import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'
import { useLogout } from '../hooks/useAuth'
import { SIDEBAR_NAV } from '../utils/constants'
import { cn } from '../utils/cn'

export default function Sidebar() {
  const { user } = useAuthStore()
  const logout = useLogout()

  if (!user) return null

  const navItems = SIDEBAR_NAV[user.role] ?? []

  return (
    <aside
      className="w-64 flex-shrink-0 flex flex-col border-r border-white/5"
      style={{ background: 'linear-gradient(180deg, #1a1f2e 0%, #1e2538 100%)' }}
    >
      {/* Brand header */}
      <div className="px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          {/* Lightning bolt icon */}
          <div className="h-9 w-9 rounded-lg bg-amber-500/20 border border-amber-500/30
            flex items-center justify-center flex-shrink-0">
            <svg className="h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 2L4.09 12.5H11L10 22L20.91 11.5H14L13 2Z" />
            </svg>
          </div>
          {/* Company name */}
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-tight tracking-wide">Reerth Technologies</p>
            <p className="text-amber-400 font-semibold text-xs tracking-widest uppercase">Pvt. Ltd.</p>
          </div>
        </div>
      </div>

      {/* User info — clickable, opens profile */}
      <NavLink
        to="/profile"
        title="View your profile"
        className={({ isActive }) =>
          cn(
            'block px-4 py-3 border-b border-white/10 transition-colors',
            isActive ? 'bg-white/10' : 'hover:bg-white/5'
          )
        }
      >
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-amber-400 text-xs font-bold">
              {(user.full_name ?? user.employee_id ?? '?').charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-white/90 text-sm font-medium truncate">{user.full_name ?? user.employee_id}</p>
            <p className="text-white/40 text-xs truncate capitalize">{user.employee_id} · {user.role}</p>
          </div>
        </div>
      </NavLink>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                  : 'text-white/55 hover:text-white/90 hover:bg-white/5 border border-transparent'
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-3 border-t border-white/10">
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium
            text-white/45 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 border border-transparent hover:border-red-500/20"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  )
}

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { LoginSchema } from '@soumya/shared'
import type { LoginDto } from '@soumya/shared'
import { useLogin } from '../../hooks/useAuth'
import { authApi } from '../../api/auth.api'
import { setAccessToken } from '../../api/client'
import { useAuthStore } from '../../store/auth.store'
import { PasswordInput } from '../../common/PasswordInput'

const FirstLoginSchema = z.object({
  employee_id: z.string().min(1, 'Employee ID is required'),
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(8, 'New password must be at least 8 characters'),
  confirm_password: z.string().min(1, 'Please confirm your new password'),
}).refine((d) => d.new_password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})
type FirstLoginDto = z.infer<typeof FirstLoginSchema>

type Tab = 'signin' | 'change'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour >= 5  && hour < 12) return { text: 'Good Morning!',   emoji: '🌅' }
  if (hour >= 12 && hour < 17) return { text: 'Good Afternoon!', emoji: '☀️' }
  if (hour >= 17 && hour < 21) return { text: 'Good Evening!',   emoji: '🌆' }
  return { text: 'Working Late?', emoji: '🌙' }
}

const inputCls = 'form-input'
const labelCls = 'block text-sm font-semibold text-gray-700 mb-1.5'
const errCls = 'text-xs text-red-600 mt-1.5'

export default function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const queryClient = useQueryClient()
  const { mutate: login, isPending, error } = useLogin()
  const [tab, setTab] = useState<Tab>('signin')
  const greeting = getGreeting()
  const [changeError, setChangeError] = useState<string | null>(null)
  const [changePending, setChangePending] = useState(false)

  const signInForm = useForm<LoginDto>({ resolver: zodResolver(LoginSchema) })
  const changeForm = useForm<FirstLoginDto>({ resolver: zodResolver(FirstLoginSchema) })

  function onSignIn(dto: LoginDto) {
    login(dto, {
      onSuccess: (result) => {
        if (result.user.is_default_password) navigate('/change-password')
        else if (result.user.role === 'owner') navigate('/owner/dashboard')
        else navigate('/dashboard')
      },
    })
  }

  async function onChangePassword(dto: FirstLoginDto) {
    setChangeError(null)
    setChangePending(true)
    try {
      const result = await authApi.login({ employee_id: dto.employee_id, password: dto.current_password })
      queryClient.clear()
      setAccessToken(result.access_token)
      setAuth(result.user, { access_token: result.access_token, refresh_token: result.refresh_token })
      await authApi.changePassword({ old_password: dto.current_password, new_password: dto.new_password })
      if (result.user.role === 'owner') navigate('/owner/dashboard')
      else navigate('/dashboard')
    } catch {
      setChangeError('Invalid Employee ID or current password. Please try again.')
    } finally {
      setChangePending(false)
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="mb-8">
        {tab === 'signin' ? (
          <>
            <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-2">
              Business Management System
            </p>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">
              {greeting.emoji} {greeting.text}
            </h2>
            <p className="text-sm text-gray-400 mt-2">
              Sign in with your employee credentials to continue
            </p>
            <div className="mt-4 h-px bg-gradient-to-r from-amber-400 via-amber-200 to-transparent" />
          </>
        ) : (
          <>
            <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-2">
              Account Security
            </p>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">
              Set New Password
            </h2>
            <p className="text-sm text-gray-400 mt-2">
              Enter your employee ID, current password and choose a new one
            </p>
            <div className="mt-4 h-px bg-gradient-to-r from-amber-400 via-amber-200 to-transparent" />
          </>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-1 mb-6 gap-1">
        <button
          type="button"
          onClick={() => setTab('signin')}
          className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-all duration-150 ${
            tab === 'signin'
              ? 'bg-white text-gray-900 shadow-sm border border-slate-200'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setTab('change')}
          className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-all duration-150 ${
            tab === 'change'
              ? 'bg-white text-gray-900 shadow-sm border border-slate-200'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Change Password
        </button>
      </div>

      {/* ── Sign In form ── */}
      {tab === 'signin' && (
        <form onSubmit={signInForm.handleSubmit(onSignIn)} className="space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              <span className="mt-0.5">⚠</span>
              <span>Invalid employee ID or password. Please try again.</span>
            </div>
          )}
          <div>
            <label className={labelCls}>Employee ID</label>
            <input {...signInForm.register('employee_id')} placeholder="e.g. SE_5001" className={inputCls} autoComplete="username" />
            {signInForm.formState.errors.employee_id && (
              <p className={errCls}>{signInForm.formState.errors.employee_id.message}</p>
            )}
          </div>
          <div>
            <label className={labelCls}>Password</label>
            <PasswordInput {...signInForm.register('password')} className={inputCls} autoComplete="current-password" />
            {signInForm.formState.errors.password && (
              <p className={errCls}>{signInForm.formState.errors.password.message}</p>
            )}
          </div>
          <button type="submit" disabled={isPending} className="btn-primary w-full py-2.5 mt-2">
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Signing in…
              </span>
            ) : 'Sign In'}
          </button>
        </form>
      )}

      {/* ── Change Password form ── */}
      {tab === 'change' && (
        <form onSubmit={changeForm.handleSubmit(onChangePassword)} className="space-y-4">
          {changeError && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              <span className="mt-0.5">⚠</span>
              <span>{changeError}</span>
            </div>
          )}
          <div>
            <label className={labelCls}>Employee ID</label>
            <input {...changeForm.register('employee_id')} placeholder="e.g. SE_5001" className={inputCls} autoComplete="username" />
            {changeForm.formState.errors.employee_id && (
              <p className={errCls}>{changeForm.formState.errors.employee_id.message}</p>
            )}
          </div>
          <div>
            <label className={labelCls}>Current Password</label>
            <PasswordInput {...changeForm.register('current_password')} className={inputCls} placeholder="Your current / default password" autoComplete="current-password" />
            {changeForm.formState.errors.current_password && (
              <p className={errCls}>{changeForm.formState.errors.current_password.message}</p>
            )}
          </div>
          <div>
            <label className={labelCls}>New Password</label>
            <PasswordInput {...changeForm.register('new_password')} className={inputCls} placeholder="Min. 8 characters" autoComplete="new-password" />
            {changeForm.formState.errors.new_password && (
              <p className={errCls}>{changeForm.formState.errors.new_password.message}</p>
            )}
          </div>
          <div>
            <label className={labelCls}>Confirm New Password</label>
            <PasswordInput {...changeForm.register('confirm_password')} className={inputCls} autoComplete="new-password" />
            {changeForm.formState.errors.confirm_password && (
              <p className={errCls}>{changeForm.formState.errors.confirm_password.message}</p>
            )}
          </div>
          <button type="submit" disabled={changePending} className="btn-primary w-full py-2.5 mt-1">
            {changePending ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Updating…
              </span>
            ) : 'Update Password & Sign In'}
          </button>
        </form>
      )}
    </div>
  )
}

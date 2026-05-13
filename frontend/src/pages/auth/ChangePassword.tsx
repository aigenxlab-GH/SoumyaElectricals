import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { ChangePasswordSchema } from '@soumya/shared'
import type { ChangePasswordDto } from '@soumya/shared'
import { useChangePassword } from '../../hooks/useAuth'
import { useAuthStore } from '../../store/auth.store'
import { PasswordInput } from '../../common/PasswordInput'

export default function ChangePassword() {
  const navigate = useNavigate()
  const { user, updateUser } = useAuthStore()
  const { mutate: changePassword, isPending, error } = useChangePassword()

  const { register, handleSubmit, formState: { errors } } = useForm<ChangePasswordDto>({
    resolver: zodResolver(ChangePasswordSchema),
  })

  function onSubmit(dto: ChangePasswordDto) {
    changePassword(dto, {
      onSuccess: () => {
        // Sync local auth state so the ProtectedRoute force-password gate lets us through
        updateUser({ is_default_password: false })
        if (user?.role === 'owner') navigate('/owner/dashboard', { replace: true })
        else navigate('/dashboard', { replace: true })
      },
    })
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-amber-500 text-lg">⚠</span>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Set New Password</h2>
        </div>
        <p className="text-sm text-gray-500">You must set a new password before you can continue.</p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          <span className="text-red-500 mt-0.5">⚠</span>
          <span>Failed to change password. Please check your current password.</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Current Password</label>
          <PasswordInput {...register('old_password')} className="form-input" autoComplete="current-password" />
          {errors.old_password && <p className="text-xs text-red-600 mt-1.5">{errors.old_password.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">New Password</label>
          <PasswordInput {...register('new_password')} className="form-input" autoComplete="new-password" />
          {errors.new_password && <p className="text-xs text-red-600 mt-1.5">{errors.new_password.message}</p>}
        </div>

        <button type="submit" disabled={isPending} className="btn-primary w-full py-2.5 mt-2">
          {isPending ? 'Saving…' : 'Set New Password'}
        </button>
      </form>
    </div>
  )
}

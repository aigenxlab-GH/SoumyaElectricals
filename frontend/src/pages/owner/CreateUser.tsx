import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserForm } from '../../components/users/UserForm'
import { useCreateUser, useUsers } from '../../hooks/useUsers'
import type { CreateUserDto } from '@soumya/shared'

// ── Error catalogue ───────────────────────────────────────────────────────────
interface ErrorInfo {
  title: string
  detail: string
  field?: string   // highlight which field caused the issue
}

function parseServerError(error: unknown): ErrorInfo | null {
  if (!error) return null

  // ── Extract the API error code from the Axios response body ──
  // Backend returns: { success: false, error: { code, message } }
  // Axios wraps this in: err.response.data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const responseData = (error as any)?.response?.data
  const apiCode: string  = responseData?.error?.code    ?? ''
  const apiMsg:  string  = responseData?.error?.message ?? ''

  // ── Match on the API code (reliable) ──
  if (apiCode === 'DUPLICATE_AADHAAR') {
    return {
      title: 'Duplicate Aadhaar Number',
      detail: 'This Aadhaar number is already registered to another employee. Each person has a unique 12-digit Aadhaar — please double-check the number and try again.',
      field: 'Aadhaar',
    }
  }
  if (apiCode === 'AUTH_CREATE_FAILED') {
    return {
      title: 'Login Setup Failed',
      detail: 'The user could not be assigned login credentials. Please try again. If the problem persists, contact support.',
    }
  }
  if (apiCode === 'VALIDATION_ERROR') {
    return {
      title: 'Invalid Input',
      detail: 'One or more fields contain invalid data. Please review all fields and try again.',
    }
  }
  if (apiCode === 'DB_ERROR') {
    return {
      title: 'Database Error',
      detail: 'An error occurred while saving the user. Please try again in a moment.',
    }
  }
  if (apiCode === 'UNAUTHORIZED') {
    return {
      title: 'Session Expired',
      detail: 'Your login session has expired. Please sign out and sign in again.',
    }
  }
  if (apiCode === 'FORBIDDEN') {
    return {
      title: 'Permission Denied',
      detail: 'You do not have permission to create users.',
    }
  }
  if (apiCode === 'LINKED_EMPLOYEES') {
    return {
      title: 'Cannot Complete Action',
      detail: apiMsg || 'This action cannot be completed due to linked records.',
    }
  }

  // ── Network error (no response at all) ──
  if (error instanceof TypeError || !(error as any).response) {
    return {
      title: 'Connection Error',
      detail: 'Could not reach the server. Please check your internet connection and try again.',
    }
  }

  // ── Fallback: show the API message if available, else the axios message ──
  const fallback = apiMsg || (error instanceof Error ? error.message : String(error))
  return {
    title: 'Something Went Wrong',
    detail: fallback || 'An unexpected error occurred. Please try again.',
  }
}

// ── Error banner component ────────────────────────────────────────────────────
function ErrorBanner({ info }: { info: ErrorInfo }) {
  return (
    <div className="flex gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3.5">
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-4.75a.75.75 0 001.5 0v-4.5a.75.75 0 00-1.5 0v4.5zm.75-7.5a.75.75 0 110 1.5.75.75 0 010-1.5z"
            clipRule="evenodd" />
        </svg>
      </div>
      {/* Text */}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-red-700">{info.title}</p>
        <p className="text-sm text-red-600 mt-0.5 leading-relaxed">{info.detail}</p>
        {info.field && (
          <p className="text-xs text-red-500 mt-1 font-medium">
            ↑ Check the <span className="underline">{info.field}</span> field above
          </p>
        )}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function CreateUser() {
  const navigate = useNavigate()
  const { data: allUsers = [] } = useUsers()
  const managers = allUsers.filter((u) => u.role === 'manager' && u.is_active)
  const { mutate, isPending, error } = useCreateUser()
  const [createdId, setCreatedId] = useState<string | null>(null)

  const errorInfo = parseServerError(error)

  function handleSubmit(dto: CreateUserDto) {
    mutate(dto, {
      onSuccess: (user) => {
        setCreatedId(user.employee_id)
        setTimeout(() => navigate('/owner/users'), 2000)
      },
    })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Create User</h1>

      {/* Success banner */}
      {createdId && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3.5">
          <svg className="h-5 w-5 text-green-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
              clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-green-700">User Created Successfully!</p>
            <p className="text-sm text-green-600">
              Employee ID assigned: <strong>{createdId}</strong> — Default password: <strong>12345678</strong>. Redirecting…
            </p>
          </div>
        </div>
      )}

      {/* Error banner — shown above form for visibility */}
      {errorInfo && <ErrorBanner info={errorInfo} />}

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <UserForm
          mode="create"
          managers={managers}
          isPending={isPending}
          serverError={null}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/owner/users')}
        />
      </div>
    </div>
  )
}

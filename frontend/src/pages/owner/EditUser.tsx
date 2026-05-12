import { useParams, useNavigate } from 'react-router-dom'
import { LoadingSpinner } from '../../common/LoadingSpinner'
import { UserForm } from '../../components/users/UserForm'
import { useUser, useUsers, useUpdateUser } from '../../hooks/useUsers'
import type { UpdateUserDto } from '@soumya/shared'

function toServerError(error: unknown): string | null {
  if (!error) return null
  if (error instanceof Error) {
    if (error.message.includes('LINKED_EMPLOYEES')) return 'Cannot change role — this manager has linked employees. Reassign them first.'
    return error.message
  }
  return 'Something went wrong'
}

export default function EditUser() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: user, isLoading } = useUser(id!)
  const { data: allUsers = [] } = useUsers()
  const { mutate, isPending, error } = useUpdateUser(id!)

  const managers = allUsers.filter((u) => u.role === 'manager' && u.is_active && u.id !== id)

  if (isLoading || !user) return <LoadingSpinner />

  function handleSubmit(dto: UpdateUserDto) {
    mutate(dto, { onSuccess: () => navigate('/owner/users') })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Edit User — {user.full_name}</h1>
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <UserForm
          mode="edit"
          editing={user}
          managers={managers}
          isPending={isPending}
          serverError={toServerError(error)}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/owner/users')}
        />
      </div>
    </div>
  )
}

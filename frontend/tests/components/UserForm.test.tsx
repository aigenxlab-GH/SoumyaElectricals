import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserForm } from '../../src/components/users/UserForm'

const noopCreate = vi.fn()
const noopEdit = vi.fn()
const noopCancel = vi.fn()

const baseManagers = [
  {
    id: 'mgr-1', employee_id: 'SE_5001', full_name: 'Rahul Sharma',
    role: 'manager' as const, sex: 'male' as const,
    date_of_birth: '1985-03-15', date_of_joining: '2018-01-01',
    manager_id: null, is_active: true, is_default_password: false,
    created_at: '', updated_at: '',
  },
]

const baseUser = {
  id: 'emp-1', employee_id: 'SE_5004', full_name: 'Deepa Nair',
  role: 'employee' as const, sex: 'female' as const,
  date_of_birth: '1995-04-12', date_of_joining: '2021-07-01',
  manager_id: 'mgr-1', is_active: true, is_default_password: false,
  created_at: '', updated_at: '',
}

function getRoleSelect(container: HTMLElement) {
  return container.querySelector('select[name="role"]') as HTMLSelectElement
}

describe('UserForm — create mode', () => {
  it('does not include "owner" in the role dropdown', () => {
    const { container } = render(
      <UserForm mode="create" managers={baseManagers} isPending={false}
        serverError={null} onSubmit={noopCreate} onCancel={noopCancel} />
    )
    const options = Array.from(getRoleSelect(container).options).map((o) => o.value)
    expect(options).not.toContain('owner')
    expect(options).toContain('employee')
    expect(options).toContain('manager')
  })

  it('renders the Aadhaar field', () => {
    render(
      <UserForm mode="create" managers={baseManagers} isPending={false}
        serverError={null} onSubmit={noopCreate} onCancel={noopCancel} />
    )
    expect(screen.getByPlaceholderText('123456789012')).toBeInTheDocument()
  })

  it('shows validation error when Aadhaar has fewer than 12 digits', async () => {
    const user = userEvent.setup()
    render(
      <UserForm mode="create" managers={baseManagers} isPending={false}
        serverError={null} onSubmit={noopCreate} onCancel={noopCancel} />
    )
    await user.type(screen.getByPlaceholderText('123456789012'), '12345')
    await user.click(screen.getByRole('button', { name: /create user/i }))
    expect(await screen.findByText('Aadhaar must be exactly 12 digits')).toBeInTheDocument()
  })

  it('displays server error when provided', () => {
    render(
      <UserForm mode="create" managers={baseManagers} isPending={false}
        serverError="Email already in use." onSubmit={noopCreate} onCancel={noopCancel} />
    )
    expect(screen.getByText('Email already in use.')).toBeInTheDocument()
  })

  it('disables submit button while pending', () => {
    render(
      <UserForm mode="create" managers={baseManagers} isPending={true}
        serverError={null} onSubmit={noopCreate} onCancel={noopCancel} />
    )
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
  })
})

describe('UserForm — edit mode', () => {
  it('shows the employee ID as read-only', () => {
    render(
      <UserForm mode="edit" editing={baseUser} managers={baseManagers} isPending={false}
        serverError={null} onSubmit={noopEdit} onCancel={noopCancel} />
    )
    const input = screen.getByDisplayValue('SE_5004') as HTMLInputElement
    expect(input.readOnly).toBe(true)
  })

  it('does not render the Aadhaar field', () => {
    render(
      <UserForm mode="edit" editing={baseUser} managers={baseManagers} isPending={false}
        serverError={null} onSubmit={noopEdit} onCancel={noopCancel} />
    )
    expect(screen.queryByPlaceholderText('123456789012')).not.toBeInTheDocument()
  })

  it('does not include "owner" in the role dropdown', () => {
    const { container } = render(
      <UserForm mode="edit" editing={baseUser} managers={baseManagers} isPending={false}
        serverError={null} onSubmit={noopEdit} onCancel={noopCancel} />
    )
    const options = Array.from(getRoleSelect(container).options).map((o) => o.value)
    expect(options).not.toContain('owner')
  })
})

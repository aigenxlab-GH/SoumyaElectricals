import type { Role } from '@soumya/shared'

export interface AuthUser {
  id: string
  employee_id: string
  role: Role
  is_default_password: boolean
  manager_id: string | null
}

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
  }
}

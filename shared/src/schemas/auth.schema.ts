import { z } from 'zod'

export const LoginSchema = z.object({
  employee_id: z.string().min(1, 'Employee ID is required'),
  password: z.string().min(1, 'Password is required'),
})

export const ChangePasswordSchema = z.object({
  old_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(8, 'New password must be at least 8 characters'),
})

export type LoginDto = z.infer<typeof LoginSchema>
export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>

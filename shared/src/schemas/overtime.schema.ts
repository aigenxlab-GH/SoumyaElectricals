import { z } from 'zod'

export const CreateOvertimeSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  hours: z.number().positive().max(24),
  work_log: z.string().min(1, 'Work log is required').max(500),
})

export const UpdateOvertimeSchema = z.object({
  hours: z.number().positive().max(24).optional(),
  work_log: z.string().min(1).max(500).optional(),
})

export type CreateOvertimeDto = z.infer<typeof CreateOvertimeSchema>
export type UpdateOvertimeDto = z.infer<typeof UpdateOvertimeSchema>

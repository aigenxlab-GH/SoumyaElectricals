import { z } from 'zod'

export const CreateTimecardSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  work_log: z.string().min(1, 'Work log is required').max(500),
})

export const BulkTimecardSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  work_log: z.string().min(1, 'Work log is required').max(500),
})

export const UpdateTimecardSchema = z.object({
  work_log: z.string().min(1).max(500),
})

export type CreateTimecardDto = z.infer<typeof CreateTimecardSchema>
export type BulkTimecardDto = z.infer<typeof BulkTimecardSchema>
export type UpdateTimecardDto = z.infer<typeof UpdateTimecardSchema>

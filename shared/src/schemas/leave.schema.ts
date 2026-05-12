import { z } from 'zod'

export const ApplyLeaveSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  reason: z.string().min(1, 'Reason is required').max(500),
})

export const BulkLeaveSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  reason: z.string().min(1, 'Reason is required').max(500),
})

export const UpdateLeaveSchema = z.object({
  reason: z.string().min(1).max(500),
})

export type ApplyLeaveDto = z.infer<typeof ApplyLeaveSchema>
export type BulkLeaveDto = z.infer<typeof BulkLeaveSchema>
export type UpdateLeaveDto = z.infer<typeof UpdateLeaveSchema>

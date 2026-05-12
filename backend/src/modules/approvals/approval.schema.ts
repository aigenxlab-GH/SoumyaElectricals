import { z } from 'zod'

export const ApprovalActionSchema = z.object({
  action: z.enum(['approve', 'reject']),
})

export type ApprovalActionDto = z.infer<typeof ApprovalActionSchema>

import { z } from 'zod'

export const QuotationItemInputSchema = z.object({
  product_id: z.string().uuid('Invalid product ID'),
  product_name_snapshot: z.string().min(1),
  selling_price_snapshot: z.number().positive(),
  quantity: z.number().int().positive('Quantity must be greater than 0'),
  total_price: z.number().positive(),
})

export const CreateQuotationSchema = z.object({
  client_name: z.string().min(1, 'Client name is required'),
  client_phone: z.string().regex(/^\d{10}$/, 'Phone number must be exactly 10 digits'),
  client_email: z.string().email('Invalid email address'),
  address: z.string().min(1, 'Address is required'),
  delivery_address: z.string().min(1, 'Delivery address is required'),
  delivery_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  discount_pct: z.number().min(0).max(100).default(0),
  subtotal: z.number().min(0),
  discount_amount: z.number().min(0),
  amount_after_discount: z.number().min(0),
  gst_pct: z.number().min(0).max(100),
  gst_amount: z.number().min(0),
  final_amount: z.number().min(0),
  items: z.array(QuotationItemInputSchema).min(1, 'At least one product is required'),
})

export const UpdateQuotationSchema = CreateQuotationSchema

export const ProcessQuotationSchema = z.object({
  action: z.enum(['approve', 'reject']),
  rejection_reason: z.string().min(1, 'Rejection reason is required').optional(),
}).refine(
  (d) => d.action !== 'reject' || (d.rejection_reason && d.rejection_reason.trim().length > 0),
  { message: 'Rejection reason is required when rejecting', path: ['rejection_reason'] }
)

export type QuotationItemInputDto = z.infer<typeof QuotationItemInputSchema>
export type CreateQuotationDto = z.infer<typeof CreateQuotationSchema>
export type UpdateQuotationDto = z.infer<typeof UpdateQuotationSchema>
export type ProcessQuotationDto = z.infer<typeof ProcessQuotationSchema>

import type { QuotationStatus } from '../types/models'

export interface QuotationListParams {
  status?:    QuotationStatus | QuotationStatus[]
  createdBy?: string  // user UUID
  search?:    string
  dateFrom?:  string   // YYYY-MM-DD — quotation_date >=
  dateTo?:    string   // YYYY-MM-DD — quotation_date <=
  limit?:     number   // default 25
  offset?:    number   // default 0
}

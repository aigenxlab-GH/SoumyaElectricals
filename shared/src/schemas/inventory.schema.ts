import { z } from 'zod'

export const ForecastEntrySchema = z.object({
  product_id: z.string().uuid('Invalid product ID'),
  forecast_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  qty_added: z.number().int('Quantity must be a whole number').min(0, 'Quantity cannot be negative'),
})

export const SaveForecastSchema = z.object({
  entries: z.array(ForecastEntrySchema).min(1, 'At least one forecast entry is required'),
})

export type ForecastEntryDto = z.infer<typeof ForecastEntrySchema>
export type SaveForecastDto = z.infer<typeof SaveForecastSchema>

import { z } from 'zod'

export const CreateProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200),
  specification: z.string().min(1, 'Specification is required'),
  category: z.string().min(1, 'Category is required').default('Electrode'),
  cost_price: z.number().positive('Cost price must be greater than 0'),
  selling_price: z.number().positive('Selling price must be greater than 0'),
}).refine((d) => d.selling_price > d.cost_price, {
  message: 'Selling price must be greater than cost price',
  path: ['selling_price'],
})

export const UpdateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  specification: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  cost_price: z.number().positive().optional(),
  selling_price: z.number().positive().optional(),
  status: z.enum(['active', 'inactive']).optional(),
}).refine(
  (d) => d.cost_price === undefined || d.selling_price === undefined || d.selling_price > d.cost_price,
  { message: 'Selling price must be greater than cost price', path: ['selling_price'] }
)

export const ToggleProductStatusSchema = z.object({
  status: z.enum(['active', 'inactive']),
})

export type CreateProductDto = z.infer<typeof CreateProductSchema>
export type UpdateProductDto = z.infer<typeof UpdateProductSchema>
export type ToggleProductStatusDto = z.infer<typeof ToggleProductStatusSchema>

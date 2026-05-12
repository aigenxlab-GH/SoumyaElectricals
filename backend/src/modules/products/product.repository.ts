import { supabase } from '../../lib/supabase'
import { AppError } from '../../types'
import type { Product } from '@soumya/shared'

export const productRepository = {
  async list(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('product_code', { ascending: true })
    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return data ?? []
  },

  async listActive(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('status', 'active')
      .order('product_code', { ascending: true })
    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return data ?? []
  },

  async findById(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return data ?? null
  },

  async findByName(name: string): Promise<{ id: string } | null> {
    const { data, error } = await supabase
      .from('products')
      .select('id')
      .ilike('name', name)
      .maybeSingle()
    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return data ?? null
  },

  async create(
    payload: Omit<Product, 'id' | 'product_code' | 'status' | 'created_at' | 'updated_at'> & { created_by: string }
  ): Promise<Product> {
    // Generate product_code using sequence
    const { data: seqData, error: seqErr } = await supabase
      .rpc('next_product_code')
    if (seqErr || !seqData) throw new AppError('DB_ERROR', seqErr?.message ?? 'Failed to generate product code', 500)

    const { data, error } = await supabase
      .from('products')
      .insert({ ...payload, product_code: seqData, status: 'active' })
      .select()
      .single()
    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return data
  },

  async update(id: string, payload: Partial<Omit<Product, 'id' | 'product_code' | 'created_at'>>): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error || !data) throw new AppError('DB_ERROR', error?.message ?? 'Product not found', 404)
    return data
  },

  async getInventoryQty(id: string): Promise<{ available_qty: number; reserved_qty: number }> {
    const { data, error } = await supabase
      .from('inventory')
      .select('available_qty, reserved_qty')
      .eq('product_id', id)
      .maybeSingle()
    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return data ?? { available_qty: 0, reserved_qty: 0 }
  },

  /** Cascade product name update to in-progress quotation items */
  async cascadeNameToQuotations(productId: string, newName: string): Promise<void> {
    // Get quotation IDs that are in active statuses
    const { data: quotes, error: qErr } = await supabase
      .from('quotations')
      .select('id')
      .in('status', ['draft', 'requested', 'approved', 'rejected'])

    if (qErr) throw new AppError('DB_ERROR', qErr.message, 500)
    if (!quotes || quotes.length === 0) return

    const quotationIds = quotes.map((q) => q.id)

    const { error } = await supabase
      .from('quotation_items')
      .update({ product_name_snapshot: newName })
      .eq('product_id', productId)
      .in('quotation_id', quotationIds)

    if (error) throw new AppError('DB_ERROR', error.message, 500)
  },
}

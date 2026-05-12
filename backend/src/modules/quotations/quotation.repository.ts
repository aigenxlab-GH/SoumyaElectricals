import { supabase } from '../../lib/supabase'
import { AppError } from '../../types'
import type { Quotation, QuotationDetail, QuotationItem, QuotationStatus } from '@soumya/shared'
import type { QuotationListParams } from '@soumya/shared'

type QuotationInsert = Omit<Quotation, 'id' | 'created_at' | 'updated_at'>
type ItemInsert = Omit<QuotationItem, 'id'>

export const quotationRepository = {
  async list(filter: {
    createdByIds?: string[]
    statuses?:     QuotationStatus[]
    search?:       string
    dateFrom?:     string
    dateTo?:       string
    /** Hide rows in these statuses unless created by this user (approvers don't see others' drafts/rejected/cancelled) */
    hideStatusesExceptUserId?: { statuses: QuotationStatus[]; userId: string }
    limit:         number
    offset:        number
  }): Promise<{ data: Quotation[]; total: number }> {
    let countQ = supabase.from('quotations').select('*', { count: 'exact', head: true })
    let dataQ  = supabase
      .from('quotations')
      .select('*')
      .order('created_at', { ascending: false })
      .range(filter.offset, filter.offset + filter.limit - 1)

    if (filter.createdByIds) {
      countQ = countQ.in('created_by', filter.createdByIds)
      dataQ  = dataQ.in('created_by', filter.createdByIds)
    }
    if (filter.statuses && filter.statuses.length > 0) {
      countQ = countQ.in('status', filter.statuses)
      dataQ  = dataQ.in('status', filter.statuses)
    }
    if (filter.search) {
      const s = filter.search.replace(/%/g, '\\%').replace(/_/g, '\\_')
      const like = `%${s}%`
      countQ = countQ.or(`client_name.ilike.${like},quotation_code.ilike.${like}`)
      dataQ  = dataQ.or(`client_name.ilike.${like},quotation_code.ilike.${like}`)
    }
    if (filter.dateFrom) {
      countQ = countQ.gte('quotation_date', filter.dateFrom)
      dataQ  = dataQ.gte('quotation_date', filter.dateFrom)
    }
    if (filter.dateTo) {
      countQ = countQ.lte('quotation_date', filter.dateTo)
      dataQ  = dataQ.lte('quotation_date', filter.dateTo)
    }
    // Hide rows in specified statuses unless they belong to the user (approvers shouldn't see others' drafts/rejected/cancelled)
    if (filter.hideStatusesExceptUserId && filter.hideStatusesExceptUserId.statuses.length > 0) {
      const { statuses, userId } = filter.hideStatusesExceptUserId
      const expr = `status.not.in.(${statuses.join(',')}),created_by.eq.${userId}`
      countQ = countQ.or(expr)
      dataQ  = dataQ.or(expr)
    }

    const [{ count, error: cErr }, { data, error: dErr }] = await Promise.all([countQ, dataQ])
    if (cErr) throw new AppError('DB_ERROR', cErr.message, 500)
    if (dErr) throw new AppError('DB_ERROR', dErr.message, 500)
    return { data: data ?? [], total: count ?? 0 }
  },

  async findById(id: string): Promise<QuotationDetail | null> {
    const { data, error } = await supabase
      .from('quotations')
      .select('*, quotation_items(*, products(product_code))')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new AppError('DB_ERROR', error.message, 500)
    if (!data) return null

    type RawItem = QuotationItem & { products: { product_code: string } | null }
    const { quotation_items, ...rest } = data as Quotation & { quotation_items: RawItem[] }

    const items: QuotationItem[] = (quotation_items ?? []).map(({ products, ...item }) => ({
      ...item,
      product_code: products?.product_code ?? undefined,
    }))

    return { ...rest, items }
  },

  async pendingList(filter: { createdByIds?: string[] }): Promise<Quotation[]> {
    let query = supabase
      .from('quotations')
      .select('*')
      .eq('status', 'requested')
      .order('updated_at', { ascending: false })

    if (filter.createdByIds) {
      query = query.in('created_by', filter.createdByIds)
    }

    const { data, error } = await query
    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return data ?? []
  },

  /** For owner: all 'requested' quotations (from anyone) + owner's own 'draft' quotations */
  async pendingListForOwner(ownerId: string): Promise<Quotation[]> {
    const [{ data: requested, error: e1 }, { data: ownDrafts, error: e2 }] = await Promise.all([
      supabase.from('quotations').select('*').eq('status', 'requested'),
      supabase.from('quotations').select('*').eq('status', 'draft').eq('created_by', ownerId),
    ])
    if (e1) throw new AppError('DB_ERROR', e1.message, 500)
    if (e2) throw new AppError('DB_ERROR', e2.message, 500)
    const combined = [...(requested ?? []), ...(ownDrafts ?? [])]
    return combined.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  },

  async create(payload: QuotationInsert, items: ItemInsert[]): Promise<QuotationDetail> {
    // Generate quotation_code
    const { data: code, error: cErr } = await supabase.rpc('next_quotation_code')
    if (cErr || !code) throw new AppError('DB_ERROR', cErr?.message ?? 'Failed to generate quotation code', 500)

    const { data: quot, error: qErr } = await supabase
      .from('quotations')
      .insert({ ...payload, quotation_code: code })
      .select()
      .single()
    if (qErr || !quot) throw new AppError('DB_ERROR', qErr?.message ?? 'Failed to create quotation', 500)

    const itemsWithId = items.map((item) => ({ ...item, quotation_id: quot.id }))
    const { data: insertedItems, error: iErr } = await supabase
      .from('quotation_items')
      .insert(itemsWithId)
      .select()
    if (iErr) throw new AppError('DB_ERROR', iErr.message, 500)

    return { ...quot, items: insertedItems ?? [] }
  },

  async update(id: string, payload: Partial<QuotationInsert>, items: ItemInsert[]): Promise<QuotationDetail> {
    const { data: quot, error: qErr } = await supabase
      .from('quotations')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (qErr || !quot) throw new AppError('DB_ERROR', qErr?.message ?? 'Quotation not found', 404)

    // Delete old items and re-insert
    const { error: delErr } = await supabase.from('quotation_items').delete().eq('quotation_id', id)
    if (delErr) throw new AppError('DB_ERROR', delErr.message, 500)

    const itemsWithId = items.map((item) => ({ ...item, quotation_id: id }))
    const { data: insertedItems, error: iErr } = await supabase
      .from('quotation_items')
      .insert(itemsWithId)
      .select()
    if (iErr) throw new AppError('DB_ERROR', iErr.message, 500)

    return { ...quot, items: insertedItems ?? [] }
  },

  async updateStatus(
    id: string,
    expectedStatus: QuotationStatus,
    newStatus: QuotationStatus,
    extra?: {
      rejection_reason?: string
      rejected_by?: string
      rejected_at?: string
      rejected_by_snapshot?: string
      rejected_by_employee_id_snapshot?: string
      approved_by?: string
      approved_at?: string
    }
  ): Promise<Quotation> {
    const { data, error } = await supabase
      .from('quotations')
      .update({ status: newStatus, updated_at: new Date().toISOString(), ...extra })
      .eq('id', id)
      .eq('status', expectedStatus)
      .select()
      .single()
    if (error || !data) throw new AppError('CONFLICT', 'Quotation is not in the expected status for this action', 409)
    return data
  },

  async getItems(quotationId: string): Promise<QuotationItem[]> {
    const { data, error } = await supabase
      .from('quotation_items')
      .select('*')
      .eq('quotation_id', quotationId)
    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return data ?? []
  },

  // ── Inventory operations ───────────────────────────────────────────────────

  /** Reserve inventory for all items in a new draft quotation */
  async reserveInventory(items: Array<{ product_id: string; quantity: number }>): Promise<void> {
    for (const item of items) {
      const { error } = await supabase.rpc('adjust_inventory', {
        p_product_id: item.product_id,
        p_available_delta: -item.quantity,
        p_reserved_delta: item.quantity,
        p_consumed_delta: 0,
        p_total_delta: 0,
      })
      if (error) throw new AppError('DB_ERROR', `Failed to reserve inventory for product ${item.product_id}: ${error.message}`, 500)
    }
  },

  /** Release inventory reservation (on reject / cancel) */
  async releaseInventory(items: Array<{ product_id: string; quantity: number }>): Promise<void> {
    for (const item of items) {
      const { error } = await supabase.rpc('adjust_inventory', {
        p_product_id: item.product_id,
        p_available_delta: item.quantity,
        p_reserved_delta: -item.quantity,
        p_consumed_delta: 0,
        p_total_delta: 0,
      })
      if (error) throw new AppError('DB_ERROR', `Failed to release inventory for product ${item.product_id}: ${error.message}`, 500)
    }
  },

  /** Consume inventory (on finalise): reserved → consumed, total −N */
  async consumeInventory(items: Array<{ product_id: string; quantity: number }>): Promise<void> {
    for (const item of items) {
      const { error } = await supabase.rpc('adjust_inventory', {
        p_product_id: item.product_id,
        p_available_delta: 0,
        p_reserved_delta: -item.quantity,
        p_consumed_delta: item.quantity,
        p_total_delta: -item.quantity,
      })
      if (error) throw new AppError('DB_ERROR', `Failed to consume inventory for product ${item.product_id}: ${error.message}`, 500)
    }
  },

  /** Hard-delete a quotation (only rejected/cancelled — no inventory adjustment needed) */
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('quotations').delete().eq('id', id)
    if (error) throw new AppError('DB_ERROR', error.message, 500)
  },

  /** Delta-adjust inventory when a draft is re-saved with changed quantities */
  async adjustInventoryDelta(
    oldItems: Array<{ product_id: string; quantity: number }>,
    newItems: Array<{ product_id: string; quantity: number }>
  ): Promise<void> {
    const oldMap: Record<string, number> = {}
    const newMap: Record<string, number> = {}
    for (const i of oldItems) oldMap[i.product_id] = (oldMap[i.product_id] ?? 0) + i.quantity
    for (const i of newItems) newMap[i.product_id] = (newMap[i.product_id] ?? 0) + i.quantity

    const allProductIds = new Set([...Object.keys(oldMap), ...Object.keys(newMap)])
    for (const pid of allProductIds) {
      const oldQty = oldMap[pid] ?? 0
      const newQty = newMap[pid] ?? 0
      const delta = newQty - oldQty
      if (delta === 0) continue
      const { error } = await supabase.rpc('adjust_inventory', {
        p_product_id: pid,
        p_available_delta: -delta,
        p_reserved_delta: delta,
        p_consumed_delta: 0,
        p_total_delta: 0,
      })
      if (error) throw new AppError('DB_ERROR', `Failed to adjust inventory for product ${pid}: ${error.message}`, 500)
    }
  },
}

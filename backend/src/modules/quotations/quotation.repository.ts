import { supabase } from '../../lib/supabase'
import { AppError } from '../../types'
import { mondayOfWeek } from '../inventory/inventory.repository'
import type { Quotation, QuotationDetail, QuotationItem, QuotationStatus } from '@soumya/shared'
import type { QuotationListParams } from '@soumya/shared'

type QuotationInsert = Omit<Quotation, 'id' | 'created_at' | 'updated_at' | 'offer_code'>
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
      countQ = countQ.or(`client_name.ilike.${like},quotation_code.ilike.${like},offer_code.ilike.${like}`)
      dataQ  = dataQ.or(`client_name.ilike.${like},quotation_code.ilike.${like},offer_code.ilike.${like}`)
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

  /**
   * Generate offer_code and atomically transition 'approved' → 'finalised'.
   * Returns the updated quotation (without items — call getItems separately).
   */
  async finaliseQuotation(id: string): Promise<Quotation> {
    const { data: code, error: cErr } = await supabase.rpc('next_offer_code')
    if (cErr || !code) throw new AppError('DB_ERROR', cErr?.message ?? 'Failed to generate offer code', 500)

    const { data, error } = await supabase
      .from('quotations')
      .update({ status: 'finalised', offer_code: code, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'approved')
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

  // ── Inventory operations (V30 forecast-consumption model) ─────────────────
  //
  // Reserving inventory now means WALKING BACKWARD from the delivery week and
  // decrementing inventory_forecast.qty_added until the requested qty is
  // satisfied. Each take is recorded in `quotation_item_consumption` so it
  // can be reverted exactly on cancel/reject/edit. The inventory aggregate
  // row tracks reserved_qty/consumed_qty as informational totals; the actual
  // per-week A is derived live from qty_added in inventoryRepository.

  /** Consume forecast rows for a single item; returns nothing, throws if short */
  async _consumeForecast(
    quotationId: string,
    productId: string,
    qty: number,
    deliveryDateISO: string
  ): Promise<void> {
    if (qty <= 0) return
    const deliveryMonday = mondayOfWeek(deliveryDateISO)

    const { data: rows, error } = await supabase
      .from('inventory_forecast')
      .select('id, forecast_date, qty_added')
      .eq('product_id', productId)
      .lte('forecast_date', deliveryMonday)
      .gt('qty_added', 0)
      .order('forecast_date', { ascending: false })
    if (error) throw new AppError('DB_ERROR', error.message, 500)

    let remaining = qty
    const consumptionRows: Array<{
      quotation_id: string
      product_id: string
      forecast_date: string
      qty_consumed: number
    }> = []

    for (const row of rows ?? []) {
      if (remaining <= 0) break
      const take = Math.min(remaining, row.qty_added)
      const { error: updErr } = await supabase
        .from('inventory_forecast')
        .update({ qty_added: row.qty_added - take })
        .eq('id', row.id)
      if (updErr) throw new AppError('DB_ERROR', updErr.message, 500)
      consumptionRows.push({
        quotation_id: quotationId,
        product_id: productId,
        forecast_date: row.forecast_date,
        qty_consumed: take,
      })
      remaining -= take
    }

    if (remaining > 0) {
      throw new AppError(
        'INSUFFICIENT_INVENTORY',
        `Insufficient projected stock for product ${productId} by ${deliveryDateISO}: short by ${remaining}`,
        400
      )
    }

    if (consumptionRows.length > 0) {
      const { error: insErr } = await supabase
        .from('quotation_item_consumption')
        .insert(consumptionRows)
      if (insErr) throw new AppError('DB_ERROR', insErr.message, 500)
    }
  },

  /** Restore forecast rows for a quotation (optionally a specific product) */
  async _revertConsumption(quotationId: string, productId?: string): Promise<void> {
    let q = supabase
      .from('quotation_item_consumption')
      .select('id, product_id, forecast_date, qty_consumed')
      .eq('quotation_id', quotationId)
    if (productId) q = q.eq('product_id', productId)

    const { data: rows, error } = await q
    if (error) throw new AppError('DB_ERROR', error.message, 500)

    for (const row of rows ?? []) {
      const { data: existing, error: fErr } = await supabase
        .from('inventory_forecast')
        .select('id, qty_added')
        .eq('product_id', row.product_id)
        .eq('forecast_date', row.forecast_date)
        .maybeSingle()
      if (fErr) throw new AppError('DB_ERROR', fErr.message, 500)

      if (existing) {
        const { error: updErr } = await supabase
          .from('inventory_forecast')
          .update({ qty_added: existing.qty_added + row.qty_consumed })
          .eq('id', existing.id)
        if (updErr) throw new AppError('DB_ERROR', updErr.message, 500)
      } else {
        // Forecast row was deleted (manager pruned the week). Recreate it.
        const { error: insErr } = await supabase
          .from('inventory_forecast')
          .insert({
            product_id: row.product_id,
            forecast_date: row.forecast_date,
            qty_added: row.qty_consumed,
          })
        if (insErr) throw new AppError('DB_ERROR', insErr.message, 500)
      }
    }

    let delQ = supabase
      .from('quotation_item_consumption')
      .delete()
      .eq('quotation_id', quotationId)
    if (productId) delQ = delQ.eq('product_id', productId)
    const { error: delErr } = await delQ
    if (delErr) throw new AppError('DB_ERROR', delErr.message, 500)
  },

  /** Apply an aggregate inventory delta (available/reserved/consumed only — never total) */
  async _bumpInventoryAggregate(
    productId: string,
    deltas: { available_delta: number; reserved_delta: number; consumed_delta: number }
  ): Promise<void> {
    const { error } = await supabase.rpc('adjust_inventory', {
      p_product_id: productId,
      p_available_delta: deltas.available_delta,
      p_reserved_delta:  deltas.reserved_delta,
      p_consumed_delta:  deltas.consumed_delta,
      p_total_delta:     0,
    })
    if (error) throw new AppError('DB_ERROR', `Failed to adjust inventory aggregate for ${productId}: ${error.message}`, 500)
  },

  /** Reserve inventory for a new quotation: consume forecast backward from delivery week */
  async reserveInventory(
    quotationId: string,
    deliveryDateISO: string,
    items: Array<{ product_id: string; quantity: number }>
  ): Promise<void> {
    for (const item of items) {
      await this._consumeForecast(quotationId, item.product_id, item.quantity, deliveryDateISO)
      await this._bumpInventoryAggregate(item.product_id, {
        available_delta: -item.quantity,
        reserved_delta:   item.quantity,
        consumed_delta:   0,
      })
    }
  },

  /** Release inventory on reject / cancel — revert all consumption for this quotation */
  async releaseInventory(
    quotationId: string,
    items: Array<{ product_id: string; quantity: number }>
  ): Promise<void> {
    await this._revertConsumption(quotationId)
    for (const item of items) {
      await this._bumpInventoryAggregate(item.product_id, {
        available_delta:  item.quantity,
        reserved_delta:  -item.quantity,
        consumed_delta:   0,
      })
    }
  },

  /**
   * Finalise (approved → finalised): inventory has already been removed from
   * forecasts when the quotation was created. Just shift the aggregate from
   * reserved to consumed. Forecast rows and consumption audit are untouched.
   */
  async consumeInventory(
    items: Array<{ product_id: string; quantity: number }>
  ): Promise<void> {
    for (const item of items) {
      await this._bumpInventoryAggregate(item.product_id, {
        available_delta:  0,
        reserved_delta:  -item.quantity,
        consumed_delta:   item.quantity,
      })
    }
  },

  /** Hard-delete a quotation (only rejected/cancelled — no inventory adjustment needed) */
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('quotations').delete().eq('id', id)
    if (error) throw new AppError('DB_ERROR', error.message, 500)
  },

  /**
   * Re-reserve inventory when a draft is re-saved with changed items.
   * Strategy: full revert of old consumption, then fresh consume of new items.
   * Simpler and less error-prone than computing per-product deltas.
   */
  async adjustInventoryDelta(
    quotationId: string,
    deliveryDateISO: string,
    oldItems: Array<{ product_id: string; quantity: number }>,
    newItems: Array<{ product_id: string; quantity: number }>
  ): Promise<void> {
    // 1. Revert old consumption (no-op if oldItems is empty, e.g. for re-opened rejected)
    await this._revertConsumption(quotationId)
    // 2. Undo old aggregate
    for (const i of oldItems) {
      await this._bumpInventoryAggregate(i.product_id, {
        available_delta:  i.quantity,
        reserved_delta:  -i.quantity,
        consumed_delta:   0,
      })
    }
    // 3. Re-consume from scratch for new items
    for (const i of newItems) {
      await this._consumeForecast(quotationId, i.product_id, i.quantity, deliveryDateISO)
      await this._bumpInventoryAggregate(i.product_id, {
        available_delta: -i.quantity,
        reserved_delta:   i.quantity,
        consumed_delta:   0,
      })
    }
  },
}

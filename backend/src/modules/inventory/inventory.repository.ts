import { supabase } from '../../lib/supabase'
import { AppError } from '../../types'
import type { InventoryRow, InventoryWeekCell } from '@soumya/shared'

/** Format a Date as YYYY-MM-DD using LOCAL date components (avoids UTC offset rollback) */
function toLocalDateISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Get next 8 upcoming Monday ISO date strings (inclusive of today if today is Monday) */
export function getNext8Mondays(): string[] {
  const mondays: string[] = []
  const d = new Date()
  const day = d.getDay() // 0=Sun, 1=Mon, … (local)
  // Days until next Monday: 0 if today is Mon, 1 if Sun, else (8 - day)
  const daysToMonday = day === 1 ? 0 : day === 0 ? 1 : 8 - day
  d.setDate(d.getDate() + daysToMonday)
  d.setHours(0, 0, 0, 0)
  for (let i = 0; i < 8; i++) {
    mondays.push(toLocalDateISO(d)) // local date — not UTC
    d.setDate(d.getDate() + 7)
  }
  return mondays
}

/** Return the Monday (YYYY-MM-DD) that begins the week containing the given date */
export function mondayOfWeek(dateISO: string): string {
  const d = new Date(`${dateISO}T12:00:00`)
  const day = d.getDay()
  // Days back to Monday: 0 if Mon, 6 if Sun, else (day - 1)
  const daysBack = day === 1 ? 0 : day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - daysBack)
  d.setHours(0, 0, 0, 0)
  return toLocalDateISO(d)
}

export const inventoryRepository = {
  /** Legacy: returns a map of product_id → current available_qty (global, ignores delivery week) */
  async getAvailableQtyMap(productIds: string[]): Promise<Record<string, number>> {
    if (productIds.length === 0) return {}
    const { data, error } = await supabase
      .from('inventory')
      .select('product_id, available_qty')
      .in('product_id', productIds)
    if (error) throw new AppError('DB_ERROR', error.message, 500)
    const map: Record<string, number> = {}
    for (const row of data ?? []) map[row.product_id] = row.available_qty
    return map
  },

  /**
   * Returns map of product_id → 8-week A array.
   *
   * New (V30) model: M per week is `inventory_forecast.qty_added` directly
   * (already reduced by active+finalised quotation consumption, since each
   * quotation create walks backward and decrements the rows it took from).
   *
   *   A(N) = baseline_before_window + sum(M for weeks 1..N)
   *
   * Where baseline_before_window is the SUM of qty_added for any forecast
   * rows older than the first visible Monday (carry-over stock).
   */
  async getWeeklyAvailabilityMap(productIds: string[]): Promise<Record<string, InventoryWeekCell[]>> {
    if (productIds.length === 0) return {}
    const mondays = getNext8Mondays()
    const lastVisibleMonday = mondays[mondays.length - 1]

    // All forecast rows up to and including the last visible Monday — group by product+date
    const { data: forecasts, error } = await supabase
      .from('inventory_forecast')
      .select('product_id, forecast_date, qty_added')
      .in('product_id', productIds)
      .lte('forecast_date', lastVisibleMonday)
    if (error) throw new AppError('DB_ERROR', error.message, 500)

    const byProduct: Record<string, Record<string, number>> = {}
    for (const f of forecasts ?? []) {
      byProduct[f.product_id] ??= {}
      byProduct[f.product_id][f.forecast_date] =
        (byProduct[f.product_id][f.forecast_date] ?? 0) + f.qty_added
    }

    const result: Record<string, InventoryWeekCell[]> = {}
    for (const pid of productIds) {
      const productData = byProduct[pid] ?? {}

      // Carry-over from any pre-window forecast rows
      let cum = 0
      for (const [dateISO, qty] of Object.entries(productData)) {
        if (dateISO < mondays[0]) cum += qty
      }

      result[pid] = mondays.map((monday) => {
        const m = productData[monday] ?? 0
        cum += m
        return { monday, M: m, A: Math.max(0, cum) }
      })
    }
    return result
  },

  /** Returns map of product_id → total reserved_qty across all active quotations */
  async getReservedQtyMap(productIds: string[]): Promise<Record<string, number>> {
    if (productIds.length === 0) return {}
    const { data, error } = await supabase
      .from('inventory')
      .select('product_id, reserved_qty')
      .in('product_id', productIds)
    if (error) throw new AppError('DB_ERROR', error.message, 500)
    const map: Record<string, number> = {}
    for (const row of data ?? []) map[row.product_id] = row.reserved_qty
    return map
  },

  async listRows(): Promise<InventoryRow[]> {
    // Fetch all active products
    const { data: products, error: pErr } = await supabase
      .from('products')
      .select('id, product_code, name')
      .eq('status', 'active')
      .order('product_code', { ascending: true })
    if (pErr) throw new AppError('DB_ERROR', pErr.message, 500)
    if (!products || products.length === 0) return []

    const productIds = products.map((p) => p.id)
    const [weeklyMap, reservedMap] = await Promise.all([
      this.getWeeklyAvailabilityMap(productIds),
      this.getReservedQtyMap(productIds),
    ])

    return products.map((p) => ({
      product_id: p.id,
      product_code: p.product_code,
      product_name: p.name,
      reserved: reservedMap[p.id] ?? 0,
      weeks: weeklyMap[p.id] ?? [],
    }))
  },

  async saveForecast(entries: Array<{ product_id: string; forecast_date: string; qty_added: number }>, createdBy: string): Promise<void> {
    if (entries.length === 0) return

    // UPSERT (replace, not add): one row per (product_id, forecast_date).
    // V29 added UNIQUE(product_id, forecast_date) which makes this idempotent —
    // typing a new value REPLACES the stored value rather than accumulating.
    const { error: fErr } = await supabase
      .from('inventory_forecast')
      .upsert(
        entries.map((e) => ({ ...e, created_by: createdBy, created_at: new Date().toISOString() })),
        { onConflict: 'product_id,forecast_date' }
      )
    if (fErr) throw new AppError('DB_ERROR', fErr.message, 500)

    // Recompute inventory aggregates for each touched product.
    // V30 invariant:
    //   available_qty = SUM(qty_added)               — what's free to commit
    //   total_qty     = available + reserved + consumed  — raw cumulative production
    const touchedProductIds = Array.from(new Set(entries.map((e) => e.product_id)))
    for (const productId of touchedProductIds) {
      const { data: rows, error: sumErr } = await supabase
        .from('inventory_forecast')
        .select('qty_added')
        .eq('product_id', productId)
      if (sumErr) throw new AppError('DB_ERROR', sumErr.message, 500)
      const sumQty = (rows ?? []).reduce((s, r) => s + (r.qty_added ?? 0), 0)

      const { data: existing } = await supabase
        .from('inventory')
        .select('reserved_qty, consumed_qty')
        .eq('product_id', productId)
        .maybeSingle()
      const reserved = existing?.reserved_qty ?? 0
      const consumed = existing?.consumed_qty ?? 0
      const total = sumQty + reserved + consumed

      if (existing) {
        const { error } = await supabase
          .from('inventory')
          .update({ total_qty: total, available_qty: sumQty, updated_at: new Date().toISOString() })
          .eq('product_id', productId)
        if (error) throw new AppError('DB_ERROR', error.message, 500)
      } else {
        const { error } = await supabase
          .from('inventory')
          .insert({ product_id: productId, total_qty: total, available_qty: sumQty, reserved_qty: 0, consumed_qty: 0 })
        if (error) throw new AppError('DB_ERROR', error.message, 500)
      }
    }
  },
}

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

const ACTIVE_QUOTATION_STATUSES = ['draft', 'requested', 'approved'] as const

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
   * Week-aware formula (reservations belong to their delivery week):
   *   A(N) = total_qty − consumed_qty − M_beyond − sum_M_after_N − cum_R_through_N
   *
   * Where cum_R_through_N is the running total of active reservations whose
   * delivery falls in visible week ≤ N. So cancelling a reservation for week K
   * only restores A for weeks ≥ K (the cancel’s qty flows into A(K) and onwards).
   *
   * Returned in the same order as getNext8Mondays().
   */
  async getWeeklyAvailabilityMap(productIds: string[]): Promise<Record<string, InventoryWeekCell[]>> {
    if (productIds.length === 0) return {}
    const mondays = getNext8Mondays()
    const lastVisibleMonday = mondays[mondays.length - 1]

    // Inventory (total + consumed; we no longer derive A from global available_qty)
    const { data: inv, error: iErr } = await supabase
      .from('inventory')
      .select('product_id, total_qty, consumed_qty')
      .in('product_id', productIds)
    if (iErr) throw new AppError('DB_ERROR', iErr.message, 500)

    const totalByProduct: Record<string, number> = {}
    const consumedByProduct: Record<string, number> = {}
    for (const r of inv ?? []) {
      totalByProduct[r.product_id] = r.total_qty
      consumedByProduct[r.product_id] = r.consumed_qty
    }

    // Forecasts inside the visible window (M per week)
    const { data: forecastsInWindow, error: f1Err } = await supabase
      .from('inventory_forecast')
      .select('product_id, forecast_date, qty_added')
      .in('product_id', productIds)
      .in('forecast_date', mondays)
    if (f1Err) throw new AppError('DB_ERROR', f1Err.message, 500)

    // Forecasts beyond the window (subtracted from baseline so they don't inflate visible A)
    const { data: forecastsBeyond, error: f2Err } = await supabase
      .from('inventory_forecast')
      .select('product_id, qty_added')
      .in('product_id', productIds)
      .gt('forecast_date', lastVisibleMonday)
    if (f2Err) throw new AppError('DB_ERROR', f2Err.message, 500)

    // Active reservations by product, grouped by Monday-of-delivery (visible weeks only)
    const { data: activeItems, error: rErr } = await supabase
      .from('quotation_items')
      .select('product_id, quantity, quotations!inner(delivery_date, status)')
      .in('product_id', productIds)
      .in('quotations.status', ACTIVE_QUOTATION_STATUSES as unknown as string[])
    if (rErr) throw new AppError('DB_ERROR', rErr.message, 500)

    const M: Record<string, Record<string, number>> = {}
    for (const f of forecastsInWindow ?? []) {
      M[f.product_id] ??= {}
      M[f.product_id][f.forecast_date] = (M[f.product_id][f.forecast_date] ?? 0) + f.qty_added
    }

    const beyondMSum: Record<string, number> = {}
    for (const f of forecastsBeyond ?? []) {
      beyondMSum[f.product_id] = (beyondMSum[f.product_id] ?? 0) + f.qty_added
    }

    // R per product per Monday (visible weeks only — reservations for delivery
    // outside the visible window do not affect any visible A cell)
    const R: Record<string, Record<string, number>> = {}
    type ItemRow = { product_id: string; quantity: number; quotations: { delivery_date: string; status: string } | { delivery_date: string; status: string }[] }
    for (const raw of (activeItems ?? []) as unknown as ItemRow[]) {
      const q = Array.isArray(raw.quotations) ? raw.quotations[0] : raw.quotations
      if (!q?.delivery_date) continue
      const wk = mondayOfWeek(q.delivery_date)
      if (!mondays.includes(wk)) continue
      R[raw.product_id] ??= {}
      R[raw.product_id][wk] = (R[raw.product_id][wk] ?? 0) + raw.quantity
    }

    // Compose week cells per product
    const result: Record<string, InventoryWeekCell[]> = {}
    for (const pid of productIds) {
      const total = totalByProduct[pid] ?? 0
      const consumed = consumedByProduct[pid] ?? 0
      const productM = M[pid] ?? {}
      const productR = R[pid] ?? {}
      const beyondM = beyondMSum[pid] ?? 0

      // sum_M_after_N: walk backwards through visible mondays
      const mAfter: Record<string, number> = {}
      let runningAfter = 0
      for (let i = mondays.length - 1; i >= 0; i--) {
        mAfter[mondays[i]] = runningAfter
        runningAfter += productM[mondays[i]] ?? 0
      }

      // cum_R_through_N: walk forwards through visible mondays
      let cumR = 0
      result[pid] = mondays.map((monday) => {
        cumR += productR[monday] ?? 0
        const A = total - consumed - beyondM - mAfter[monday] - cumR
        return {
          monday,
          M: productM[monday] ?? 0,
          A: Math.max(0, A),
        }
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

    // Insert forecast records
    const { error: fErr } = await supabase.from('inventory_forecast').insert(
      entries.map((e) => ({ ...e, created_by: createdBy }))
    )
    if (fErr) throw new AppError('DB_ERROR', fErr.message, 500)

    // Update inventory quantities (upsert — create row if not exists)
    const productTotals: Record<string, number> = {}
    for (const e of entries) {
      productTotals[e.product_id] = (productTotals[e.product_id] ?? 0) + e.qty_added
    }

    for (const [productId, qty] of Object.entries(productTotals)) {
      // Check if inventory row exists
      const { data: existing } = await supabase
        .from('inventory')
        .select('id, total_qty, available_qty')
        .eq('product_id', productId)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from('inventory')
          .update({
            total_qty: existing.total_qty + qty,
            available_qty: existing.available_qty + qty,
            updated_at: new Date().toISOString(),
          })
          .eq('product_id', productId)
        if (error) throw new AppError('DB_ERROR', error.message, 500)
      } else {
        const { error } = await supabase
          .from('inventory')
          .insert({ product_id: productId, total_qty: qty, available_qty: qty, reserved_qty: 0, consumed_qty: 0 })
        if (error) throw new AppError('DB_ERROR', error.message, 500)
      }
    }
  },
}

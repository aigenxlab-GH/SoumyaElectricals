import { quotationRepository } from './quotation.repository'
import { inventoryRepository, mondayOfWeek } from '../inventory/inventory.repository'
import { userRepository } from '../users/user.repository'
import { AppError } from '../../types'
import type { AuthUser } from '../../types'
import type { CreateQuotationDto, UpdateQuotationDto, ProcessQuotationDto, QuotationItem, QuotationListParams, InventoryWeekCell } from '@soumya/shared'

/**
 * Look up A (computed available) for each product in the given delivery week.
 * Returns map product_id → A value. If the delivery date is outside the
 * visible 8-week window, falls back to the latest visible week's A (or 0).
 */
async function getDeliveryWeekAvailability(
  productIds: string[],
  deliveryDateISO: string
): Promise<Record<string, number>> {
  if (productIds.length === 0) return {}
  const weeklyMap = await inventoryRepository.getWeeklyAvailabilityMap(productIds)
  const deliveryWeek = mondayOfWeek(deliveryDateISO)
  const result: Record<string, number> = {}
  for (const pid of productIds) {
    const cells: InventoryWeekCell[] = weeklyMap[pid] ?? []
    const match = cells.find((c) => c.monday === deliveryWeek)
    if (match) {
      result[pid] = match.A
    } else if (cells.length > 0) {
      // Delivery is outside the visible window — use the latest week's A as upper bound
      result[pid] = cells[cells.length - 1].A
    } else {
      result[pid] = 0
    }
  }
  return result
}

/** Build the set of creator IDs this user is allowed to see */
async function getScopeIds(user: AuthUser): Promise<string[] | undefined> {
  if (user.role === 'owner') return undefined  // all
  if (user.role === 'manager') {
    const team = await userRepository.listReportableUsers(user.id)
    return [user.id, ...team.map((u) => u.id)]
  }
  return [user.id]  // employee
}

/** Build the set of creator IDs for the approval queue */
async function getApprovalScopeIds(user: AuthUser): Promise<string[] | undefined> {
  if (user.role === 'owner') return undefined  // sees all requested
  if (user.role === 'manager') {
    const team = await userRepository.listReportableUsers(user.id)
    return team.map((u) => u.id)  // employees only (not self)
  }
  throw new AppError('FORBIDDEN', 'Not authorised to approve quotations', 403)
}

function buildItemInserts(items: CreateQuotationDto['items']) {
  return items.map((item) => ({
    product_id: item.product_id,
    product_name_snapshot: item.product_name_snapshot,
    selling_price_snapshot: item.selling_price_snapshot,
    quantity: item.quantity,
    total_price: item.total_price,
    quotation_id: '',  // will be replaced in repository
  }))
}

export const quotationService = {
  async list(user: AuthUser, params: QuotationListParams) {
    const scopeIds = await getScopeIds(user)

    // Normalise status to array
    const statusArr = params.status
      ? (Array.isArray(params.status) ? params.status : [params.status])
      : undefined

    // Honour Created By filter — but only if the requested user is within the caller's scope
    let createdByIds = scopeIds
    if (params.createdBy) {
      if (scopeIds && !scopeIds.includes(params.createdBy)) {
        // Out-of-scope user requested → return nothing
        return { data: [], total: 0 }
      }
      createdByIds = [params.createdBy]
    }

    return quotationRepository.list({
      createdByIds,
      statuses: statusArr,
      search:   params.search,
      dateFrom: params.dateFrom,
      dateTo:   params.dateTo,
      // Approvers (owner/manager) cannot see others' drafts/rejected/cancelled — only their own
      hideStatusesExceptUserId: user.role === 'employee'
        ? undefined
        : { statuses: ['draft', 'rejected', 'cancelled'], userId: user.id },
      limit:    params.limit  ?? 25,
      offset:   params.offset ?? 0,
    })
  },

  async getById(id: string, user: AuthUser) {
    const quotation = await quotationRepository.findById(id)
    if (!quotation) throw new AppError('NOT_FOUND', 'Quotation not found', 404)

    // Scope check
    const ids = await getScopeIds(user)
    if (ids && !ids.includes(quotation.created_by ?? '')) {
      throw new AppError('FORBIDDEN', 'Not authorised to view this quotation', 403)
    }
    // Approvers (owner/manager) cannot view another user's draft / rejected / cancelled directly
    if (user.role !== 'employee'
        && ['draft', 'rejected', 'cancelled'].includes(quotation.status)
        && quotation.created_by !== user.id) {
      throw new AppError('FORBIDDEN', 'Not authorised to view this quotation', 403)
    }

    return quotation
  },

  async pendingList(user: AuthUser) {
    if (user.role === 'owner') {
      // Owner sees: all 'requested' quotations + their own 'draft' quotations (for self-approve)
      return quotationRepository.pendingListForOwner(user.id)
    }
    const ids = await getApprovalScopeIds(user)
    return quotationRepository.pendingList({ createdByIds: ids })
  },

  async create(dto: CreateQuotationDto, user: AuthUser) {
    const creatorUser = await userRepository.findById(user.id)

    const payload = {
      quotation_code: '',  // will be generated in repository
      client_name: dto.client_name,
      client_phone: dto.client_phone,
      client_email: dto.client_email,
      address: dto.address,
      delivery_address: dto.delivery_address,
      quotation_date: new Date().toISOString().split('T')[0],
      delivery_date: dto.delivery_date,
      discount_pct: dto.discount_pct,
      subtotal: dto.subtotal,
      discount_amount: dto.discount_amount,
      amount_after_discount: dto.amount_after_discount,
      gst_pct: dto.gst_pct,
      gst_amount: dto.gst_amount,
      final_amount: dto.final_amount,
      status: 'draft' as const,
      rejection_reason: null,
      created_by: user.id,
      creator_name_snapshot: creatorUser?.full_name ?? '',
      creator_employee_id_snapshot: user.employee_id,
      creator_mobile_snapshot: creatorUser?.phone ?? null,
      creator_email_snapshot: creatorUser?.email ?? null,
      approved_by: null,
      approved_at: null,
      rejected_by: null,
      rejected_at: null,
      rejected_by_snapshot: null,
      rejected_by_employee_id_snapshot: null,
    }

    // ── Inventory availability check (against A in delivery week) ─────────────
    const productIds = dto.items.map((i) => i.product_id)
    const availMap = await getDeliveryWeekAvailability(productIds, dto.delivery_date)
    for (const item of dto.items) {
      const available = availMap[item.product_id] ?? 0
      if (item.quantity > available) {
        throw new AppError(
          'INSUFFICIENT_INVENTORY',
          `Insufficient stock for "${item.product_name_snapshot}" by ${dto.delivery_date}: requested ${item.quantity}, only ${available} projected available`,
          400
        )
      }
    }

    const items = buildItemInserts(dto.items)
    const quotation = await quotationRepository.create(payload, items)

    // Reserve inventory
    await quotationRepository.reserveInventory(
      dto.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity }))
    )

    return quotation
  },

  async update(id: string, dto: UpdateQuotationDto, user: AuthUser) {
    const existing = await quotationRepository.findById(id)
    if (!existing) throw new AppError('NOT_FOUND', 'Quotation not found', 404)
    if (existing.created_by !== user.id) throw new AppError('FORBIDDEN', 'You can only edit your own quotations', 403)
    if (existing.status !== 'draft' && existing.status !== 'rejected') {
      throw new AppError('UNEDITABLE', 'Only Draft or Rejected quotations can be edited', 400)
    }

    const oldItems = existing.items
    const newItems = buildItemInserts(dto.items)

    // ── Inventory availability check for delta increases ──────────────────────
    // If quotation was rejected, its inventory was already released — treat old
    // reserved qty as 0 so ALL new items are checked against current available
    const oldItemsForDelta = existing.status === 'rejected' ? [] : oldItems
    const oldQtyMap: Record<string, number> = {}
    for (const i of oldItemsForDelta) {
      if (i.product_id) oldQtyMap[i.product_id] = (oldQtyMap[i.product_id] ?? 0) + i.quantity
    }
    // Find items that need MORE stock than before (new product or increased qty)
    const increases = dto.items
      .map((i) => ({ ...i, delta: i.quantity - (oldQtyMap[i.product_id] ?? 0) }))
      .filter((i) => i.delta > 0)
    if (increases.length > 0) {
      const availMap = await getDeliveryWeekAvailability(
        increases.map((i) => i.product_id),
        dto.delivery_date
      )
      for (const item of increases) {
        const available = availMap[item.product_id] ?? 0
        if (item.delta > available) {
          throw new AppError(
            'INSUFFICIENT_INVENTORY',
            `Insufficient stock for "${item.product_name_snapshot}" by ${dto.delivery_date}: need ${item.delta} more unit(s), only ${available} projected available`,
            400
          )
        }
      }
    }

    const updated = await quotationRepository.update(id, {
      client_name: dto.client_name,
      client_phone: dto.client_phone,
      client_email: dto.client_email,
      address: dto.address,
      delivery_address: dto.delivery_address,
      delivery_date: dto.delivery_date,
      discount_pct: dto.discount_pct,
      subtotal: dto.subtotal,
      discount_amount: dto.discount_amount,
      amount_after_discount: dto.amount_after_discount,
      gst_pct: dto.gst_pct,
      gst_amount: dto.gst_amount,
      final_amount: dto.final_amount,
    }, newItems)

    // Adjust inventory for delta
    // For rejected quotations: oldItemsForDelta is [] so new items are fully reserved fresh
    await quotationRepository.adjustInventoryDelta(
      oldItemsForDelta.map((i) => ({ product_id: i.product_id!, quantity: i.quantity })),
      dto.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity }))
    )

    return updated
  },

  async submit(id: string, user: AuthUser) {
    const existing = await quotationRepository.findById(id)
    if (!existing) throw new AppError('NOT_FOUND', 'Quotation not found', 404)
    if (existing.created_by !== user.id) throw new AppError('FORBIDDEN', 'You can only submit your own quotations', 403)
    if (user.role === 'owner') throw new AppError('FORBIDDEN', 'Owner must use Self-Approve instead', 400)
    return quotationRepository.updateStatus(id, 'draft', 'requested')
  },

  async selfApprove(id: string, user: AuthUser) {
    if (user.role !== 'owner') throw new AppError('FORBIDDEN', 'Only Owner can self-approve', 403)
    const existing = await quotationRepository.findById(id)
    if (!existing) throw new AppError('NOT_FOUND', 'Quotation not found', 404)
    if (existing.created_by !== user.id) throw new AppError('FORBIDDEN', 'You can only self-approve your own quotations', 403)
    return quotationRepository.updateStatus(id, 'draft', 'approved', {
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
  },

  async selfReject(id: string, user: AuthUser) {
    if (user.role !== 'owner') throw new AppError('FORBIDDEN', 'Only Owner can self-reject', 403)
    const existing = await quotationRepository.findById(id)
    if (!existing) throw new AppError('NOT_FOUND', 'Quotation not found', 404)
    if (existing.created_by !== user.id) throw new AppError('FORBIDDEN', 'You can only self-reject your own quotations', 403)
    const rejectorUser = await userRepository.findById(user.id)
    const result = await quotationRepository.updateStatus(id, 'draft', 'rejected', {
      rejected_by: user.id,
      rejected_at: new Date().toISOString(),
      rejected_by_snapshot: rejectorUser?.full_name ?? '',
      rejected_by_employee_id_snapshot: user.employee_id,
    })
    // Release reserved inventory back to available
    await quotationRepository.releaseInventory(
      existing.items.map((i) => ({ product_id: i.product_id!, quantity: i.quantity }))
    )
    return result
  },

  async finalise(id: string, user: AuthUser) {
    const existing = await quotationRepository.findById(id)
    if (!existing) throw new AppError('NOT_FOUND', 'Quotation not found', 404)

    // Scope check
    const ids = await getScopeIds(user)
    if (ids && !ids.includes(existing.created_by ?? '')) {
      throw new AppError('FORBIDDEN', 'Not authorised to finalise this quotation', 403)
    }

    const result = await quotationRepository.updateStatus(id, 'approved', 'finalised')

    // Consume inventory
    const items = await quotationRepository.getItems(id)
    await quotationRepository.consumeInventory(
      items.map((i) => ({ product_id: i.product_id!, quantity: i.quantity }))
    )

    return result
  },

  async cancel(id: string, user: AuthUser) {
    const existing = await quotationRepository.findById(id)
    if (!existing) throw new AppError('NOT_FOUND', 'Quotation not found', 404)
    if (existing.created_by !== user.id) throw new AppError('FORBIDDEN', 'You can only cancel your own quotations', 403)
    if (existing.status !== 'draft' && existing.status !== 'rejected') {
      throw new AppError('INVALID_STATUS', 'Only Draft or Rejected quotations can be cancelled', 400)
    }

    const result = await quotationRepository.updateStatus(id, existing.status, 'cancelled')

    // Release inventory reservation
    const items = existing.items
    await quotationRepository.releaseInventory(
      items.map((i) => ({ product_id: i.product_id!, quantity: i.quantity }))
    )

    return result
  },

  async delete(id: string, user: AuthUser) {
    const existing = await quotationRepository.findById(id)
    if (!existing) throw new AppError('NOT_FOUND', 'Quotation not found', 404)
    if (existing.status !== 'rejected' && existing.status !== 'cancelled') {
      throw new AppError('INVALID_STATUS', 'Only rejected or cancelled quotations can be deleted', 400)
    }
    if (existing.created_by !== user.id && user.role !== 'owner') {
      throw new AppError('FORBIDDEN', 'Not authorised to delete this quotation', 403)
    }
    // No inventory adjustment — already released when the quotation was rejected/cancelled
    await quotationRepository.delete(id)
  },

  async approve(id: string, dto: ProcessQuotationDto, user: AuthUser) {
    const existing = await quotationRepository.findById(id)
    if (!existing) throw new AppError('NOT_FOUND', 'Quotation not found', 404)

    // Scope check
    const ids = await getApprovalScopeIds(user)
    if (ids && !ids.includes(existing.created_by ?? '')) {
      throw new AppError('FORBIDDEN', 'Not authorised to approve this quotation', 403)
    }

    if (dto.action === 'approve') {
      return quotationRepository.updateStatus(id, 'requested', 'approved', {
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
    } else {
      const rejectorUser = await userRepository.findById(user.id)
      const result = await quotationRepository.updateStatus(id, 'requested', 'rejected', {
        rejection_reason: dto.rejection_reason,
        rejected_by: user.id,
        rejected_at: new Date().toISOString(),
        rejected_by_snapshot: rejectorUser?.full_name ?? '',
        rejected_by_employee_id_snapshot: user.employee_id,
      })
      // Release reserved inventory back to available
      await quotationRepository.releaseInventory(
        existing.items.map((i) => ({ product_id: i.product_id!, quantity: i.quantity }))
      )
      return result
    }
  },
}

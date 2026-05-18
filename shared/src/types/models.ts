import type { Role, Sex, Status } from './enums'

export interface User {
  id: string
  employee_id: string
  full_name: string
  role: Role
  sex: Sex
  date_of_birth: string
  date_of_joining: string
  manager_id: string | null
  is_active: boolean
  is_default_password: boolean
  phone: string | null
  address: string | null
  email: string | null
  created_at: string
  updated_at: string
}

export interface Timecard {
  id: string
  user_id: string
  date: string
  work_log: string
  status: Status
  created_at: string
  updated_at: string
}

export interface Overtime {
  id: string
  user_id: string
  date: string
  hours: number
  payout: number
  work_log: string
  status: Status
  created_at: string
  updated_at: string
}

export interface Leave {
  id: string
  user_id: string
  date: string
  reason: string
  status: Status
  created_at: string
  updated_at: string
}

export interface LeaveBalance {
  id: string
  user_id: string
  total_credited: number
  used: number
  remaining: number
  updated_at: string
}

export interface Holiday {
  id: string
  date: string
  name: string
}

export interface SystemConfig {
  id: string
  annual_leave_days: number
  overtime_rate_per_hour: number          // employee overtime rate
  manager_overtime_rate_per_hour: number  // manager overtime rate
  gst_pct: number                         // GST rate for quotations
  // Company branding (used in PDF and headers)
  brand_name: string
  company_name: string
  company_address: string
  gstin_no: string
  company_email: string
  company_phone: string
  company_website: string
  authorized_signatory: string
  updated_at: string
}

// ── Products ──────────────────────────────────────────────────────────────────

export interface Product {
  id: string
  product_code: string
  name: string
  specification: string
  category: string
  cost_price: number
  selling_price: number
  status: 'active' | 'inactive'
  created_by: string | null
  created_at: string
  updated_at: string
}

// ── Inventory ─────────────────────────────────────────────────────────────────

export interface Inventory {
  id: string
  product_id: string
  total_qty: number
  available_qty: number
  reserved_qty: number
  consumed_qty: number
  updated_at: string
}

/** One weekly cell — Monday + manufactured (M), available (A) */
export interface InventoryWeekCell {
  monday: string   // YYYY-MM-DD (Monday)
  M: number        // Manufactured this week (editable forecast qty)
  A: number        // Available as of this week (computed)
}

/** One row in the inventory table view — product info + total reserved + 8-week M/A cells */
export interface InventoryRow {
  product_id: string
  product_code: string
  product_name: string
  /** Total reserved qty across all active quotations (single value, not per-week) */
  reserved: number
  /** 8 weekly cells starting from the current Monday */
  weeks: InventoryWeekCell[]
}

// ── Quotations ────────────────────────────────────────────────────────────────

export type QuotationStatus = 'draft' | 'requested' | 'approved' | 'rejected' | 'finalised' | 'cancelled'

export interface QuotationItem {
  id: string
  quotation_id: string
  product_id: string | null
  product_code?: string           // joined from products table on detail fetch
  product_name_snapshot: string
  selling_price_snapshot: number
  quantity: number
  total_price: number
}

export interface Quotation {
  id: string
  quotation_code: string
  offer_code: string | null   // set when status transitions to 'finalised'
  client_name: string
  client_phone: string
  client_email: string
  address: string
  delivery_address: string
  quotation_date: string
  delivery_date: string
  discount_pct: number
  subtotal: number
  discount_amount: number
  amount_after_discount: number
  gst_pct: number
  gst_amount: number
  final_amount: number
  status: QuotationStatus
  rejection_reason: string | null
  rejected_by: string | null
  rejected_at: string | null
  rejected_by_snapshot: string | null
  rejected_by_employee_id_snapshot: string | null
  created_by: string | null
  creator_name_snapshot: string
  creator_employee_id_snapshot: string
  creator_mobile_snapshot: string | null
  creator_email_snapshot: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

/** Full quotation detail including items and joined user info */
export interface QuotationDetail extends Quotation {
  items: QuotationItem[]
  creator_full_name?: string
  approver_full_name?: string
  approver_employee_id?: string
}

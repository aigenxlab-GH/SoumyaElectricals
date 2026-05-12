import { z } from 'zod'

// GSTIN format: 2-digit state + 10-char PAN + 1-digit entity + Z + 1 check digit = 15 chars
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
// Indian mobile: optional +91, then 10 digits starting with 6–9
const PHONE_REGEX = /^(\+91[-\s]?)?[6-9]\d{9}$/

export const SystemConfigSchema = z.object({
  annual_leave_days: z.number().int().positive().max(365),
  overtime_rate_per_hour: z.number().positive(),
  manager_overtime_rate_per_hour: z.number().positive(),
  gst_pct: z.number().min(0).max(100),

  // Company branding (used in PDF and headers)
  brand_name: z.string().min(1, 'Brand name is required').max(120),
  company_name: z.string().min(1, 'Company name is required').max(200),
  company_address: z.string().min(1, 'Address is required').max(500),
  gstin_no: z.string().regex(GSTIN_REGEX, 'Invalid GSTIN (e.g. 22AAAAA0000A1Z5)'),
  company_email: z.string().email('Invalid email address'),
  company_phone: z.string().regex(PHONE_REGEX, 'Invalid phone (10-digit Indian mobile, optional +91)'),
  company_website: z.string().url('Invalid URL (e.g. https://example.com)').or(z.literal('')),
  authorized_signatory: z.string().min(1, 'Authorized signatory is required').max(120),

  holidays: z.array(
    z.object({
      date: z.string().min(1, 'Please select a date').regex(/^\d{4}-\d{2}-\d{2}$/, 'Please select a valid date'),
      name: z.string().min(1, 'Please enter holiday description').max(100, 'Description too long'),
    })
  ),
})

export type SystemConfigDto = z.infer<typeof SystemConfigSchema>

import { z } from 'zod'

// Update schema allows manager/employee only (owner cannot be set via edit)
const updateRoleEnum = z.enum(['manager', 'employee'])

// Create schema allows owner as well (owner can create another owner)
const createRoleEnum = z.enum(['manager', 'employee', 'owner'])

/** Today's date in YYYY-MM-DD (local). Used by both DOB and DOJ to reject future dates. */
const todayISO = () => new Date().toISOString().split('T')[0]

export const CreateUserSchema = z.object({
  full_name:      z.string().min(1, 'Full name is required').max(100),
  role:           createRoleEnum,
  sex:            z.enum(['male', 'female', 'other']),
  date_of_birth:  z.string()
                    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
                    .refine((d) => d <= todayISO(), 'Date of birth cannot be in the future'),
  date_of_joining: z.string()
                    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
                    .refine((d) => d <= todayISO(), 'Date of joining cannot be in the future'),
  aadhaar:        z.string().regex(/^\d{12}$/, 'Aadhaar must be exactly 12 digits'),
  // Empty string from <select> default → treated as null
  manager_id: z.preprocess(
    (v) => (v === '' || v === undefined ? null : v),
    z.string().uuid().nullable().optional()
  ),
  // Strip spaces/dashes before validating; accept 10-digit Indian mobile or +91 prefix form
  phone: z.preprocess(
    (v) => (typeof v === 'string' ? v.replace(/[\s\-\(\)]/g, '') : v),
    z.string()
      .min(1, 'Phone number is required')
      .regex(
        /^(\+91)?[6-9]\d{9}$/,
        'Enter a valid 10-digit mobile number starting with 6–9 (e.g. 9876543210 or +91 9876543210)'
      )
  ),
  address: z.string().min(1, 'Address is required').max(500),
  // Empty string from form → treated as absent; validate format only when provided
  email: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().email('Invalid email format').optional()
  ),
  // Optional at creation — owner can set later via Edit User
  monthly_salary: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number().positive('Monthly salary must be greater than 0').optional()
  ),
})

export const UpdateUserSchema = z.object({
  full_name:      z.string().min(1).max(100).optional(),
  role:           updateRoleEnum.optional(),
  sex:            z.enum(['male', 'female', 'other']).optional(),
  date_of_birth:  z.string()
                    .regex(/^\d{4}-\d{2}-\d{2}$/)
                    .refine((d) => d <= todayISO(), 'Date of birth cannot be in the future')
                    .optional(),
  manager_id:     z.string().uuid().nullable().optional(),
  is_active:      z.boolean().optional(),
})

export type CreateUserDto = z.infer<typeof CreateUserSchema>
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>

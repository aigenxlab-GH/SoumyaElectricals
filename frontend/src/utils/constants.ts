import type { Role } from '@soumya/shared'

export const MAX_DATE_RANGE_DAYS = 31

export interface NavItem {
  label: string
  path: string
}

export const SIDEBAR_NAV: Record<Role, NavItem[]> = {
  employee: [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Inventory', path: '/inventory' },
    { label: 'Quotations', path: '/quotations' },
    { label: 'Offers', path: '/offers' },
    { label: 'My Timecard', path: '/my-timecard' },
    { label: 'My Leave', path: '/my-leave' },
    { label: 'My Calendar', path: '/my-calendar' },
    { label: 'My Payslips', path: '/payroll' },
  ],
  manager: [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Inventory', path: '/inventory' },
    { label: 'Quotations', path: '/quotations' },
    { label: 'Offers', path: '/offers' },
    { label: 'My Timecard', path: '/my-timecard' },
    { label: 'My Leave', path: '/my-leave' },
    { label: 'My Calendar', path: '/my-calendar' },
    { label: 'Timecard Approvals', path: '/approvals/timecards' },
    { label: 'Leave Approvals', path: '/approvals/leaves' },
    { label: 'Payroll', path: '/payroll' },
  ],
  owner: [
    { label: 'Dashboard', path: '/owner/dashboard' },
    { label: 'Products', path: '/owner/products' },
    { label: 'Inventory', path: '/inventory' },
    { label: 'Quotations', path: '/quotations' },
    { label: 'Offers', path: '/offers' },
    { label: 'Users', path: '/owner/users' },
    { label: 'Payroll', path: '/payroll' },
    { label: 'Timecard Approvals', path: '/owner/approvals/timecards' },
    { label: 'Leave Approvals', path: '/owner/approvals/leaves' },
    { label: 'Team Calendar', path: '/owner/calendar' },
    { label: 'System Config', path: '/owner/config' },
  ],
}

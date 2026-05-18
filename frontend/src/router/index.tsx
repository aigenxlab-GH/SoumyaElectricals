import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { RoleRoute } from './RoleRoute'

import Login from '../pages/auth/Login'
import ChangePassword from '../pages/auth/ChangePassword'
import Dashboard from '../pages/employee/Dashboard'
import MyTimecard from '../pages/employee/MyTimecard'
import MyLeave from '../pages/employee/MyLeave'
import MyCalendar from '../pages/employee/MyCalendar'
import TimecardApproval from '../pages/manager/TimecardApproval'
import LeaveApproval from '../pages/manager/LeaveApproval'
import OwnerDashboard from '../pages/owner/OwnerDashboard'
import ManagerTimecardApproval from '../pages/owner/ManagerTimecardApproval'
import ManagerLeaveApproval from '../pages/owner/ManagerLeaveApproval'
import TeamCalendar from '../pages/owner/TeamCalendar'
import UserManagement from '../pages/owner/UserManagement'
import CreateUser from '../pages/owner/CreateUser'
import EditUser from '../pages/owner/EditUser'
import UserDetail from '../pages/owner/UserDetail'
import Profile from '../pages/Profile'
import PayrollList from '../pages/payroll/PayrollList'
import PayrollDetail from '../pages/payroll/PayrollDetail'
import SystemConfig from '../pages/owner/SystemConfig'
import ProductList from '../pages/owner/ProductList'
import AddProduct from '../pages/owner/AddProduct'
import EditProduct from '../pages/owner/EditProduct'
import InventoryPage from '../pages/inventory/InventoryPage'
import QuotationList from '../pages/quotations/QuotationList'
import CreateQuotation from '../pages/quotations/CreateQuotation'
import EditQuotation from '../pages/quotations/EditQuotation'
import QuotationDetail from '../pages/quotations/QuotationDetail'
import AppLayout from '../layouts/AppLayout'
import AuthLayout from '../layouts/AuthLayout'

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <Login /> },
      { path: '/change-password', element: <ChangePassword /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/dashboard', element: <Dashboard /> },
          { path: '/profile',   element: <Profile /> },
          { path: '/my-timecard', element: <MyTimecard /> },
          { path: '/my-leave', element: <MyLeave /> },
          { path: '/my-calendar', element: <MyCalendar /> },
          { path: '/inventory', element: <InventoryPage /> },
          { path: '/quotations', element: <QuotationList /> },
          { path: '/quotations/new', element: <CreateQuotation /> },
          { path: '/quotations/:id', element: <QuotationDetail /> },
          { path: '/quotations/:id/edit', element: <EditQuotation /> },
          {
            element: <RoleRoute allowedRoles={['manager', 'owner']} />,
            children: [
              { path: '/approvals/timecards', element: <TimecardApproval /> },
              { path: '/approvals/leaves', element: <LeaveApproval /> },
            ],
          },
          // Payroll is available to all authenticated roles — the page renders a
          // self-view for employees and a roster + bulk view for owner/manager.
          { path: '/payroll', element: <PayrollList /> },
          { path: '/payroll/:id', element: <PayrollDetail /> },
          {
            element: <RoleRoute allowedRoles={['owner']} />,
            children: [
              { path: '/owner/dashboard', element: <OwnerDashboard /> },
              { path: '/owner/approvals/timecards', element: <ManagerTimecardApproval /> },
              { path: '/owner/approvals/leaves', element: <ManagerLeaveApproval /> },
              { path: '/owner/calendar', element: <TeamCalendar /> },
              { path: '/owner/users', element: <UserManagement /> },
              { path: '/owner/users/new', element: <CreateUser /> },
              { path: '/owner/users/:id', element: <UserDetail /> },
              { path: '/owner/users/:id/edit', element: <EditUser /> },
              { path: '/owner/config', element: <SystemConfig /> },
              { path: '/owner/products', element: <ProductList /> },
              { path: '/owner/products/new', element: <AddProduct /> },
              { path: '/owner/products/:id/edit', element: <EditProduct /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/unauthorized', element: <div>403 — You do not have permission to view this page.</div> },
  { path: '*', element: <div>404 — Page not found.</div> },
])

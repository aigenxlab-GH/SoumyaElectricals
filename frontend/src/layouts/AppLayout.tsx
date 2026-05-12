import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import logo from '../assets/logo.png'

export default function AppLayout() {
  return (
    <div className="min-h-screen flex bg-slate-100">
      <div className="flex flex-1 min-h-0">
        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* Logo watermark — centered in content area */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
            style={{ zIndex: 0 }}
            aria-hidden="true"
          >
            <img
              src={logo}
              alt=""
              style={{ width: '420px', height: '420px', opacity: 0.04, objectFit: 'contain' }}
            />
          </div>

          <main className="flex-1 overflow-auto p-6 relative z-10">
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

import { Outlet } from 'react-router-dom'
import logo from '../assets/logo.png'

export default function AuthLayout() {
  return (
    /* Full-screen — inset box-shadow creates the visible border around the viewport */
    <div
      className="min-h-screen bg-slate-200 flex items-center justify-center p-6"
      style={{ boxShadow: 'inset 0 0 0 3px #94a3b8' }}
    >
      {/* ── Card with visible border + shadow ── */}
      <div
        className="w-full max-w-4xl rounded-2xl overflow-hidden flex"
        style={{
          minHeight: '560px',
          border: '2px solid #cbd5e1',
          boxShadow: '0 24px 64px rgba(0,0,0,0.20), 0 4px 16px rgba(0,0,0,0.10)',
        }}
      >

        {/* ── Left pane — dark decorative panel ── */}
        <div
          className="hidden md:flex md:w-2/5 flex-col justify-between p-10 relative"
          style={{ background: 'linear-gradient(160deg, #1a1f2e 0%, #252d3d 100%)' }}
        >
          {/* Dot-grid pattern */}
          <div
            className="absolute inset-0"
            style={{
              opacity: 0.06,
              backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }}
          />
          {/* Amber right-edge accent */}
          <div className="absolute right-0 top-8 bottom-8 w-px bg-amber-500/40" />

          <div className="relative z-10">
            {/* Company logo — circular crop */}
            <div className="mb-4 flex justify-center mt-4">
              <div
                className="rounded-full overflow-hidden border-4 border-white/20 shadow-2xl"
                style={{ width: '260px', height: '260px' }}
              >
                <img
                  src={logo}
                  alt="Reerth Technologies Pvt. Ltd."
                  className="w-full h-full object-cover scale-110"
                />
              </div>
            </div>

            {/* Company name below logo */}
            <div className="mb-6 text-center">
              <p
                className="text-amber-400 font-extrabold tracking-tight leading-tight drop-shadow"
                style={{ fontSize: '1.15rem', letterSpacing: '-0.01em', fontFamily: 'Georgia, "Times New Roman", serif' }}
              >
                Reerth Technologies Pvt. Ltd.
              </p>
            </div>

            <div className="border-t border-white/10 pt-5">
              <h2
                className="text-white font-extrabold leading-tight whitespace-nowrap"
                style={{ fontSize: '1rem', letterSpacing: '-0.02em', fontFamily: 'Georgia, "Times New Roman", serif' }}
              >
                One login. Your entire business.
              </h2>
              <p className="text-white/50 text-xs mt-2 leading-relaxed font-light tracking-wide">
                End-to-end operations management for your business
              </p>
            </div>
          </div>

          <div className="relative z-10">
            <div className="flex flex-wrap gap-2 mb-4">
              {['People', 'Products', 'Inventory', 'Quotations'].map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-3 py-1 rounded-full border border-amber-400/40 text-amber-300 font-semibold tracking-wide bg-amber-400/5"
                >
                  {tag}
                </span>
              ))}
            </div>
            <p className="text-white/25 text-xs whitespace-nowrap">
              © {new Date().getFullYear()} Soumya Earthing Electrodes. Internal use only.
            </p>
          </div>
        </div>

        {/* ── Right pane — form area ── */}
        <div className="flex-1 flex flex-col bg-slate-50 p-10">
          <div className="flex-1 flex flex-col justify-center">
            <Outlet />
          </div>

          <p className="mt-8 text-center text-xs text-gray-400">
            © {new Date().getFullYear()} Soumya Earthing Electrodes — Internal use only
          </p>
        </div>

      </div>
    </div>
  )
}

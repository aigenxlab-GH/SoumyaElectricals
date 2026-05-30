import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthContext, useAuthState } from './store/auth.store'
import { router } from './router'

// Dev-only: expose router.navigate so Puppeteer screenshot scripts can do
// client-side navigation without page reloads (which would clear in-memory JWT).
if (import.meta.env.DEV) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).__navigate = router.navigate
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, tokens, setAuth, updateUser, clearAuth } = useAuthState()
  return (
    <AuthContext.Provider value={{ user, tokens, setAuth, updateUser, clearAuth, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  )
}

import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthContext, useAuthState } from './store/auth.store'
import { router } from './router'

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

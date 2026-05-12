import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../api/client'

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: unknown }>('/dashboard')
      return data.data
    },
  })
}

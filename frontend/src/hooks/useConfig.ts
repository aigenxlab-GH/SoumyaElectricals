import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { configApi } from '../api/config.api'
import type { SystemConfigDto } from '@soumya/shared'

const keys = { config: () => ['system-config'] as const }

export function useSystemConfig() {
  return useQuery({ queryKey: keys.config(), queryFn: () => configApi.get() })
}

export function useSaveConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: SystemConfigDto) => configApi.save(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.config() }),
  })
}

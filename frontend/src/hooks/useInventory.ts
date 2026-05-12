import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryApi } from '../api/inventory.api'
import type { SaveForecastDto } from '@soumya/shared'

const keys = {
  all: () => ['inventory'] as const,
}

export function useInventory() {
  return useQuery({ queryKey: keys.all(), queryFn: () => inventoryApi.list() })
}

export function useSaveForecast() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: SaveForecastDto) => inventoryApi.saveForecast(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all() }),
  })
}

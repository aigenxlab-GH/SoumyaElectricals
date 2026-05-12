import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productsApi } from '../api/products.api'
import type { CreateProductDto, UpdateProductDto, ToggleProductStatusDto } from '@soumya/shared'

const keys = {
  all: () => ['products'] as const,
  active: () => ['products', 'active'] as const,
  detail: (id: string) => ['products', id] as const,
}

export function useProducts() {
  return useQuery({ queryKey: keys.all(), queryFn: () => productsApi.list() })
}

export function useActiveProducts() {
  return useQuery({ queryKey: keys.active(), queryFn: () => productsApi.listActive() })
}

export function useProduct(id: string) {
  return useQuery({ queryKey: keys.detail(id), queryFn: () => productsApi.getById(id), enabled: !!id })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateProductDto) => productsApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all() })
      qc.invalidateQueries({ queryKey: keys.active() })
    },
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateProductDto }) => productsApi.update(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: keys.all() })
      qc.invalidateQueries({ queryKey: keys.active() })
      qc.invalidateQueries({ queryKey: keys.detail(id) })
    },
  })
}

export function useToggleProductStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ToggleProductStatusDto }) => productsApi.toggleStatus(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: keys.all() })
      qc.invalidateQueries({ queryKey: keys.active() })
      qc.invalidateQueries({ queryKey: keys.detail(id) })
    },
  })
}

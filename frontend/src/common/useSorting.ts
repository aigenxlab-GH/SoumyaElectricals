import { useState, useMemo } from 'react'

export type SortDir = 'asc' | 'desc'

export interface SortState<K extends string> {
  key: K
  dir: SortDir
}

export function useSorting<T, K extends keyof T & string>(
  data: T[],
  defaultKey: K,
  defaultDir: SortDir = 'desc',
) {
  const [sort, setSort] = useState<SortState<K>>({ key: defaultKey, dir: defaultDir })

  function toggle(key: string) {
    const k = key as K
    setSort((prev) =>
      prev.key === k
        ? { key: k, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key: k, dir: 'desc' },
    )
  }

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const av = a[sort.key]
      const bv = b[sort.key]
      if (av === bv) return 0
      const cmp = av < bv ? -1 : 1
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [data, sort.key, sort.dir])

  return { sorted, sort, toggle }
}

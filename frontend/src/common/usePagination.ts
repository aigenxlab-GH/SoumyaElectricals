import { useState, useEffect, useMemo } from 'react'

export type PageSize = 10 | 15 | 'all'

export function usePagination<T>(items: T[], defaultPageSize: PageSize = 10) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSizeRaw] = useState<PageSize>(defaultPageSize)

  // Reset to page 1 whenever the list length changes (filter or data refresh)
  useEffect(() => { setPage(1) }, [items.length])

  function setPageSize(size: PageSize) {
    setPageSizeRaw(size)
    setPage(1)
  }

  const total = items.length
  const effectiveSize = pageSize === 'all' ? Math.max(total, 1) : pageSize
  const totalPages = Math.max(1, Math.ceil(total / effectiveSize))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * effectiveSize
  const paged = useMemo(
    () => (pageSize === 'all' ? items : items.slice(start, start + effectiveSize)),
    [items, start, effectiveSize, pageSize],
  )

  return {
    paged,
    page: safePage,
    pageSize,
    totalPages,
    total,
    rangeStart: total > 0 ? start + 1 : 0,
    rangeEnd: Math.min(start + effectiveSize, total),
    setPage,
    setPageSize,
  }
}

/**
 * Extracts a human-readable message from an Axios/API error.
 *
 * Backend response shape on failure:
 *   { success: false, error: { code: string, message: string } }
 *
 * Axios stores this in:
 *   err.response.data  →  the body above
 *
 * Fallback chain:
 *   1. err.response.data.error.message  (API error, most specific)
 *   2. err.message                       (Axios/network message)
 *   3. 'Something went wrong'
 */
export function parseApiError(error: unknown): string | null {
  if (!error) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = error as any
  const apiMessage: string | undefined = e?.response?.data?.error?.message
  if (apiMessage) return apiMessage
  const fallback: string | undefined = e?.message
  return fallback ?? 'Something went wrong'
}

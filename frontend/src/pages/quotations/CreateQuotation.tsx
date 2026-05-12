import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { QuotationForm } from '../../components/quotations/QuotationForm'
import { useCreateQuotation, useSubmitQuotation, useSelfApproveQuotation, useSelfRejectQuotation } from '../../hooks/useQuotations'
import { parseApiError } from '../../utils/api-error'
import type { CreateQuotationDto } from '@soumya/shared'
import { useState } from 'react'

export default function CreateQuotation() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const createQ = useCreateQuotation()
  const submitQ = useSubmitQuotation()
  const selfApprove = useSelfApproveQuotation()
  const selfReject = useSelfRejectQuotation()

  const isPending = createQ.isPending || submitQ.isPending || selfApprove.isPending || selfReject.isPending

  /** Wait for the quotations list cache to repopulate, then navigate. Prevents stale-data flash. */
  async function goToListWhenFresh() {
    await queryClient.refetchQueries({ queryKey: ['quotations', 'list'] })
    navigate('/quotations')
  }

  function handleSaveDraft(dto: CreateQuotationDto) {
    setServerError(null)
    createQ.mutate(dto, {
      onSuccess: () => { void goToListWhenFresh() },
      onError: (err) => setServerError(parseApiError(err)),
    })
  }

  function handleSubmitForApproval(dto: CreateQuotationDto) {
    setServerError(null)
    createQ.mutate(dto, {
      onSuccess: (q) => {
        submitQ.mutate(q.id, {
          onSuccess: () => { void goToListWhenFresh() },
          onError: (err) => setServerError(parseApiError(err)),
        })
      },
      onError: (err) => setServerError(parseApiError(err)),
    })
  }

  function handleSelfApprove(dto: CreateQuotationDto) {
    setServerError(null)
    createQ.mutate(dto, {
      onSuccess: (q) => {
        selfApprove.mutate(q.id, {
          onSuccess: () => { void goToListWhenFresh() },
          onError: (err) => setServerError(parseApiError(err)),
        })
      },
      onError: (err) => setServerError(parseApiError(err)),
    })
  }

  function handleSelfReject(dto: CreateQuotationDto) {
    setServerError(null)
    createQ.mutate(dto, {
      onSuccess: (q) => {
        selfReject.mutate(q.id, {
          onSuccess: () => { void goToListWhenFresh() },
          onError: (err) => setServerError(parseApiError(err)),
        })
      },
      onError: (err) => setServerError(parseApiError(err)),
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/quotations')} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
        <h1 className="text-xl font-semibold text-gray-900">New Quotation</h1>
      </div>
      <QuotationForm
        mode="create"
        onSaveDraft={handleSaveDraft}
        onSubmitForApproval={handleSubmitForApproval}
        onSelfApprove={handleSelfApprove}
        onSelfReject={handleSelfReject}
        onCancel={() => navigate('/quotations')}
        isPending={isPending}
        serverError={serverError}
      />
    </div>
  )
}

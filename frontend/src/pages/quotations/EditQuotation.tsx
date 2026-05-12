import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { QuotationForm } from '../../components/quotations/QuotationForm'
import { useQuotation, useUpdateQuotation, useSubmitQuotation, useSelfApproveQuotation, useSelfRejectQuotation } from '../../hooks/useQuotations'
import { LoadingSpinner } from '../../common/LoadingSpinner'
import { parseApiError } from '../../utils/api-error'
import type { CreateQuotationDto } from '@soumya/shared'

export default function EditQuotation() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const { data: quotation, isLoading } = useQuotation(id ?? '')
  const updateQ = useUpdateQuotation()
  const submitQ = useSubmitQuotation()
  const selfApprove = useSelfApproveQuotation()
  const selfReject = useSelfRejectQuotation()

  const isPending = updateQ.isPending || submitQ.isPending || selfApprove.isPending || selfReject.isPending

  if (isLoading) return <div className="p-6"><LoadingSpinner /></div>
  if (!quotation) return <div className="p-6 text-gray-500">Quotation not found.</div>

  /** Wait for detail + list caches to repopulate, then navigate. Prevents stale-data flash. */
  async function goToDetailWhenFresh(qid: string) {
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['quotations', qid] }),
      queryClient.refetchQueries({ queryKey: ['quotations', 'list'] }),
    ])
    navigate(`/quotations/${qid}`)
  }

  function handleSaveDraft(dto: CreateQuotationDto) {
    if (!id) return
    setServerError(null)
    updateQ.mutate({ id, dto }, {
      onSuccess: () => { void goToDetailWhenFresh(id) },
      onError: (err) => setServerError(parseApiError(err)),
    })
  }

  function handleSubmitForApproval(dto: CreateQuotationDto) {
    if (!id) return
    setServerError(null)
    updateQ.mutate({ id, dto }, {
      onSuccess: () => {
        submitQ.mutate(id, {
          onSuccess: () => { void goToDetailWhenFresh(id) },
          onError: (err) => setServerError(parseApiError(err)),
        })
      },
      onError: (err) => setServerError(parseApiError(err)),
    })
  }

  function handleSelfApprove(dto: CreateQuotationDto) {
    if (!id) return
    setServerError(null)
    updateQ.mutate({ id, dto }, {
      onSuccess: () => {
        selfApprove.mutate(id, {
          onSuccess: () => { void goToDetailWhenFresh(id) },
          onError: (err) => setServerError(parseApiError(err)),
        })
      },
      onError: (err) => setServerError(parseApiError(err)),
    })
  }

  function handleSelfReject(dto: CreateQuotationDto) {
    if (!id) return
    setServerError(null)
    updateQ.mutate({ id, dto }, {
      onSuccess: () => {
        selfReject.mutate(id, {
          onSuccess: () => { void goToDetailWhenFresh(id) },
          onError: (err) => setServerError(parseApiError(err)),
        })
      },
      onError: (err) => setServerError(parseApiError(err)),
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/quotations/${id}`)} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
        <h1 className="text-xl font-semibold text-gray-900">Edit Quotation — {quotation.quotation_code}</h1>
      </div>
      <QuotationForm
        mode="edit"
        existing={quotation}
        onSaveDraft={handleSaveDraft}
        onSubmitForApproval={handleSubmitForApproval}
        onSelfApprove={handleSelfApprove}
        onSelfReject={handleSelfReject}
        onCancel={() => navigate(`/quotations/${id}`)}
        isPending={isPending}
        serverError={serverError}
      />
    </div>
  )
}

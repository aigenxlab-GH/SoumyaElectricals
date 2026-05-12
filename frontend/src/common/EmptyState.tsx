interface Props {
  message?: string
}

export function EmptyState({ message = 'No records found.' }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-14 w-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mb-3">
        <span className="text-slate-400 text-2xl">○</span>
      </div>
      <p className="text-sm font-medium text-slate-500">{message}</p>
    </div>
  )
}

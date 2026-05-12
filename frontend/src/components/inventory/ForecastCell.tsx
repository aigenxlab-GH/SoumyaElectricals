interface Props {
  value: string
  onChange: (val: string) => void
  isDirty: boolean
  disabled: boolean
}

export function ForecastCell({ value, onChange, isDirty, disabled }: Props) {
  return (
    <input
      type="number"
      min={1}
      step={1}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder="—"
      className={[
        'w-20 text-center text-sm rounded border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500',
        disabled ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white border-gray-300',
        isDirty && !disabled ? 'ring-2 ring-blue-400 border-blue-400' : '',
      ].join(' ')}
    />
  )
}

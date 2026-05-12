interface Props {
  size?: number
  className?: string
}

export function BrandLogo({ size = 48, className = '' }: Props) {
  return (
    <div
      className={`flex-shrink-0 rounded-xl flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
        boxShadow: '0 2px 10px rgba(180,83,9,0.5)',
        flexShrink: 0,
      }}
    >
      {/* Lightning bolt SVG — white fill on amber background */}
      <svg
        viewBox="0 0 20 20"
        fill="white"
        style={{ width: size * 0.55, height: size * 0.55 }}
      >
        <path d="M11 1L3 12h6l-1 7 9-11h-6l1-7z" />
      </svg>
    </div>
  )
}

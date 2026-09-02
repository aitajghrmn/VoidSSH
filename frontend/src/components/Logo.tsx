interface LogoProps {
  size?: number
  showText?: boolean
  className?: string
}

function Logo({ size = 40, showText = true, className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: 'drop-shadow(0 0 8px var(--color-primary-500))' }}
        aria-hidden="true"
      >
        <path
          d="M24 2 L44 14 L44 34 L24 46 L4 34 L4 14 Z"
          stroke="var(--color-primary-400)"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M24 2 L24 46 M4 14 L44 34 M44 14 L4 34"
          stroke="var(--color-primary-400)"
          strokeWidth="1.5"
          opacity="0.5"
        />
        <path d="M24 12 L34 18 L34 30 L24 36 L14 30 L14 18 Z" fill="var(--color-primary-500)" opacity="0.9" />
      </svg>
      {showText && (
        <span className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-primary-400)' }}>
          Void<span className="opacity-80">SSH</span>
        </span>
      )}
    </div>
  )
}

export default Logo

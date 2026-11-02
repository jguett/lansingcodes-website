interface LansingCodesIconProps {
  className?: string
}

export default function LansingCodesIcon({ className = '' }: LansingCodesIconProps) {
  return <span aria-hidden="true" className={`lc-logo-icon ${className}`} />
}

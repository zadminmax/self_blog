/** 无 useId，适合在服务端页面单次使用（避免同页重复 id） */
export function SiteLogoStatic({ size = 112, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id="bobo-logo-static-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill="url(#bobo-logo-static-grad)" />
      <rect x="9" y="11" width="22" height="3.5" rx="1" fill="white" opacity={0.95} />
      <rect x="9" y="17.25" width="16" height="3.5" rx="1" fill="white" opacity={0.88} />
      <rect x="9" y="23.5" width="19" height="3.5" rx="1" fill="white" opacity={0.78} />
    </svg>
  )
}

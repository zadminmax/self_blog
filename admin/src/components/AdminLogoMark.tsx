import { useId } from 'react'

/** 与前台一致的站点图标（渐变方标 + 栈形横条） */
export function AdminLogoMark({ size = 32 }: { size?: number }) {
  const gid = useId().replace(/:/g, '')
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden focusable="false">
      <defs>
        <linearGradient id={`alg-${gid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill={`url(#alg-${gid})`} />
      <rect x="9" y="11" width="22" height="3.5" rx="1" fill="white" opacity={0.95} />
      <rect x="9" y="17.25" width="16" height="3.5" rx="1" fill="white" opacity={0.88} />
      <rect x="9" y="23.5" width="19" height="3.5" rx="1" fill="white" opacity={0.78} />
    </svg>
  )
}

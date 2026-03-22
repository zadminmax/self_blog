"use client"

type Props = {
  className?: string
  size?: number
}

const GRAD_ID = "bb-site-header-logo-grad"

/** 与 Pencil 稿一致的渐变方标 + 三条「栈」形横条（固定渐变 id，避免 useId 水合边界问题） */
export function SiteLogo({ className = "", size = 36 }: Props) {
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
        <linearGradient id={GRAD_ID} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill={`url(#${GRAD_ID})`} />
      <rect x="9" y="11" width="22" height="3.5" rx="1" fill="white" opacity={0.95} />
      <rect x="9" y="17.25" width="16" height="3.5" rx="1" fill="white" opacity={0.88} />
      <rect x="9" y="23.5" width="19" height="3.5" rx="1" fill="white" opacity={0.78} />
    </svg>
  )
}

import { resolveMediaUrl } from "@/lib/api"
import { SiteLogoStatic } from "@/components/SiteLogoStatic"

type Props = {
  logoUrl?: string
  size?: number
  className?: string
}

/** 有后台配置的 logo_url 则显示图片，否则用默认 SVG 字标方块 */
export function SiteBrandMark({ logoUrl, size = 88, className = "" }: Props) {
  const u = logoUrl?.trim()
  if (u) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolveMediaUrl(u)}
        alt=""
        width={size}
        height={size}
        className={`object-contain ${className}`}
      />
    )
  }
  return <SiteLogoStatic size={size} className={className} />
}

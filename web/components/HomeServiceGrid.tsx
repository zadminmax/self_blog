import Link from "next/link"
import type { PublicServiceOffer } from "@/lib/api"
import { resolveMediaUrl } from "@/lib/api"

type Props = {
  services: PublicServiceOffer[]
  /** 首页与线框稿一致：最多 6 条，2×3 */
  limit?: number
}

export function HomeServiceGrid({ services, limit = 6 }: Props) {
  const items = services.slice(0, limit)
  if (items.length === 0) return null

  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
      {items.map((s) => (
        <Link
          key={s.id}
          href={`/services#service-${s.slug}`}
          className="group flex gap-4 overflow-hidden rounded-[var(--radius-card)] border border-stone-200/90 bg-[var(--surface)] p-4 shadow-sm transition hover:border-stone-300 hover:shadow-md sm:p-5"
        >
          {s.cover_url ? (
            <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-stone-100 sm:h-24 sm:w-28">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolveMediaUrl(s.cover_url)}
                alt=""
                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="h-20 w-24 shrink-0 rounded-lg bg-gradient-to-br from-blue-50 to-sky-100 sm:h-24 sm:w-28" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-base font-semibold leading-snug text-stone-900 transition group-hover:text-[var(--accent)]">
                {s.name}
              </h3>
              {s.price_text ? (
                <span className="shrink-0 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-[var(--accent)]">
                  {s.price_text}
                </span>
              ) : null}
            </div>
            {s.category ? (
              <p className="mt-1 text-xs font-medium text-stone-500">{s.category}</p>
            ) : null}
            {s.summary ? (
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-stone-600">{s.summary}</p>
            ) : null}
          </div>
        </Link>
      ))}
    </div>
  )
}

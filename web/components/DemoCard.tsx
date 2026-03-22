import type { PublicDemoListItem } from "@/lib/api"
import { resolveMediaUrl } from "@/lib/api"

type Props = {
  demo: PublicDemoListItem
  /** 在新标签页打开 Demo 运行页（站内 /demos/slug） */
  openInNewTab?: boolean
}

export function DemoCard({ demo, openInNewTab = true }: Props) {
  const href = `/demos/${demo.slug}`

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-stone-200/90 bg-[var(--surface)] shadow-sm transition hover:border-stone-300 hover:shadow-md">
      <a
        href={href}
        {...(openInNewTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="flex h-full flex-col outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
      >
        {demo.cover_url ? (
          <div className="aspect-[16/9] w-full shrink-0 overflow-hidden bg-stone-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveMediaUrl(demo.cover_url)}
              alt=""
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="aspect-[16/9] w-full shrink-0 bg-gradient-to-br from-blue-50 to-stone-100" />
        )}
        <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
          {demo.category?.name ? (
            <span className="w-fit rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 text-xs font-medium text-stone-600">
              {demo.category.name}
            </span>
          ) : null}
          <h2 className="text-balance text-lg font-semibold leading-snug text-stone-900 transition group-hover:text-[var(--accent)]">
            {demo.name}
          </h2>
          {demo.description ? (
            <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-stone-600">{demo.description}</p>
          ) : null}
          <span className="text-xs font-medium text-[var(--accent)]">打开 Demo →</span>
        </div>
      </a>
    </article>
  )
}

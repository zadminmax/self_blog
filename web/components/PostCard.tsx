import Link from "next/link"
import type { PublicPostListItem } from "@/lib/api"
import { resolveMediaUrl } from "@/lib/api"

type Props = {
  post: PublicPostListItem
  /** 首页线框：横向摘要列表 */
  variant?: "card" | "row"
}

export function PostCard({ post, variant = "card" }: Props) {
  if (variant === "row") {
    return (
      <article className="group flex overflow-hidden rounded-[var(--radius-card)] border border-stone-200/90 bg-[var(--surface)] shadow-sm transition hover:border-stone-300 hover:shadow-md">
        <Link href={`/posts/${post.slug}`} className="flex min-h-[112px] w-full min-w-0 flex-row items-stretch sm:min-h-[124px]">
          {post.cover_url ? (
            <div className="relative h-auto w-[120px] shrink-0 overflow-hidden bg-stone-100 sm:w-[200px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolveMediaUrl(post.cover_url)}
                alt=""
                className="h-full min-h-[112px] w-full object-cover transition duration-300 group-hover:scale-[1.03] sm:min-h-[124px]"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="h-auto min-h-[112px] w-[120px] shrink-0 bg-gradient-to-br from-stone-100 to-stone-200/80 sm:min-h-[124px] sm:w-[200px]" />
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-2 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
              <span className="rounded-md bg-stone-100 px-2 py-0.5 font-medium text-stone-700">{post.content_type}</span>
              {post.published_at ? (
                <time dateTime={post.published_at}>{new Date(post.published_at).toLocaleDateString("zh-CN")}</time>
              ) : null}
            </div>
            {post.categories && post.categories.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {post.categories.map((c) => (
                  <span
                    key={c.id}
                    className="rounded-md border border-stone-200 bg-stone-50/80 px-2 py-0.5 text-xs text-stone-600"
                  >
                    {c.name}
                  </span>
                ))}
              </div>
            ) : null}
            <h2 className="text-balance text-base font-semibold leading-snug text-stone-900 transition group-hover:text-[var(--accent)] sm:text-lg">
              {post.title}
            </h2>
            {post.excerpt ? (
              <p className="line-clamp-3 text-sm leading-relaxed text-stone-600">{post.excerpt}</p>
            ) : null}
            {post.tags && post.tags.length > 0 ? (
              <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                {post.tags.slice(0, 4).map((t) => (
                  <span key={t.id} className="text-xs text-[var(--accent)]">
                    #{t.name}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </Link>
      </article>
    )
  }

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-stone-200/90 bg-[var(--surface)] shadow-sm transition hover:border-stone-300 hover:shadow-md">
      <Link href={`/posts/${post.slug}`} className="flex h-full flex-col">
        {post.cover_url ? (
          <div className="aspect-[16/9] w-full shrink-0 overflow-hidden bg-stone-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveMediaUrl(post.cover_url)}
              alt=""
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="aspect-[16/9] w-full shrink-0 bg-gradient-to-br from-stone-100 to-stone-200/80" />
        )}
        <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
            <span className="rounded-md bg-stone-100 px-2 py-0.5 font-medium text-stone-700">
              {post.content_type}
            </span>
            {post.published_at ? (
              <time dateTime={post.published_at}>{new Date(post.published_at).toLocaleDateString("zh-CN")}</time>
            ) : null}
          </div>
          {post.categories && post.categories.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {post.categories.map((c) => (
                <span
                  key={c.id}
                  className="rounded-md border border-stone-200 bg-stone-50/80 px-2 py-0.5 text-xs text-stone-600"
                >
                  {c.name}
                </span>
              ))}
            </div>
          ) : null}
          <h2 className="text-balance text-lg font-semibold leading-snug text-stone-900 transition group-hover:text-[var(--accent)]">
            {post.title}
          </h2>
          {post.excerpt ? <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-stone-600">{post.excerpt}</p> : null}
          {post.tags && post.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {post.tags.slice(0, 4).map((t) => (
                <span key={t.id} className="text-xs text-[var(--accent)]">
                  #{t.name}
                </span>
              ))}
              {post.tags.length > 4 ? <span className="text-xs text-stone-400">+{post.tags.length - 4}</span> : null}
            </div>
          ) : null}
        </div>
      </Link>
    </article>
  )
}

import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { fetchPostBySlug, resolveMediaUrl } from "@/lib/api"
import { ArticleBody } from "@/components/ArticleBody"

type Props = { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await fetchPostBySlug(params.slug)
  if (!post) return { title: "未找到" }
  return {
    title: post.title,
    description: post.excerpt || post.title,
    openGraph: {
      title: post.title,
      description: post.excerpt || undefined,
      type: "article",
      publishedTime: post.published_at,
    },
  }
}

export default async function PostDetailPage({ params }: Props) {
  const post = await fetchPostBySlug(params.slug)
  if (!post) notFound()

  return (
    <article className="w-full space-y-8">
      <header className="space-y-4 border-b border-stone-200 pb-8">
        <div className="flex flex-wrap items-center gap-2 text-sm text-stone-500">
          <span className="rounded-md bg-stone-100 px-2 py-0.5 font-medium text-stone-700">{post.content_type}</span>
          {post.published_at ? (
            <time dateTime={post.published_at}>发布于 {new Date(post.published_at).toLocaleString("zh-CN")}</time>
          ) : null}
        </div>
        {post.categories && post.categories.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {post.categories.map((c) => (
              <Link
                key={c.id}
                href={`/posts?category=${encodeURIComponent(c.slug)}`}
                className="rounded-full border border-stone-200 bg-white px-3 py-1 text-sm text-stone-700 transition hover:border-stone-300 hover:bg-stone-50"
              >
                {c.name}
              </Link>
            ))}
          </div>
        ) : null}
        <h1 className="text-balance text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">{post.title}</h1>
        {post.excerpt ? <p className="text-pretty text-lg leading-relaxed text-stone-600">{post.excerpt}</p> : null}
        {post.cover_url ? (
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-stone-200 bg-stone-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resolveMediaUrl(post.cover_url)} alt="" className="h-auto w-full object-cover" loading="eager" />
          </div>
        ) : null}
        {post.tags && post.tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {post.tags.map((t) => (
              <Link
                key={t.id}
                href={`/posts?tag=${encodeURIComponent(t.slug)}`}
                className="text-sm font-medium text-[var(--accent)] hover:underline"
              >
                #{t.name}
              </Link>
            ))}
          </div>
        ) : null}
      </header>
      <ArticleBody html={post.body_html} />
    </article>
  )
}

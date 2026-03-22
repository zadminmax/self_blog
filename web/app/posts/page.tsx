import Link from "next/link"
import {
  fetchPostList,
  fetchCategoryList,
  fetchTagList,
  fetchSiteSettings,
} from "@/lib/api"
import { PostCard } from "@/components/PostCard"
import { PostsPagination } from "@/components/PostsPagination"

type Props = { searchParams: { page?: string; tag?: string; category?: string } }

export const metadata = {
  title: "文章",
  description: "全部技术文章与笔记",
}

function buildQuery(base: Record<string, string | undefined>, page: number): string {
  const p = new URLSearchParams()
  if (base.tag) p.set("tag", base.tag)
  if (base.category) p.set("category", base.category)
  if (page > 1) p.set("page", String(page))
  const s = p.toString()
  return s ? `?${s}` : ""
}

export default async function PostsPage({ searchParams }: Props) {
  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1)
  const pageSize = 12
  const tag = searchParams.tag?.trim() || undefined
  const category = searchParams.category?.trim() || undefined

  let data = { items: [] as Awaited<ReturnType<typeof fetchPostList>>["items"], total: 0, page: 1, page_size: pageSize }
  let categories: Awaited<ReturnType<typeof fetchCategoryList>> = []
  let tags: Awaited<ReturnType<typeof fetchTagList>> = []

  try {
    ;[data, categories, tags] = await Promise.all([
      fetchPostList({ page, pageSize, tag, category }),
      fetchCategoryList(),
      fetchTagList(),
    ])
  } catch {
    try {
      data = await fetchPostList({ page, pageSize, tag, category })
    } catch {
      data = { items: [], total: 0, page: 1, page_size: pageSize }
    }
  }

  const totalPages = Math.max(1, Math.ceil(data.total / pageSize))
  const filterBase = { tag, category }

  const sortZh = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "zh-CN")

  categories = [...categories].sort(sortZh)
  tags = [...tags].sort(sortZh)

  const site = await fetchSiteSettings()

  /** 原型：分类 = 纵向列表（整行可点） */
  const categoryRow = (active: boolean) =>
    active
      ? "block w-full rounded-lg border border-sky-200/90 bg-sky-50 py-2.5 pl-3 pr-2 text-left text-sm font-medium text-sky-800 shadow-sm transition hover:bg-sky-100/70"
      : "block w-full rounded-lg py-2.5 pl-3 pr-2 text-left text-sm text-stone-700 transition hover:bg-stone-50"

  /** 原型：标签 = 标签云式多行圆角 chip + # */
  const tagPill = (active: boolean) =>
    active
      ? "rounded-full bg-sky-100 px-3 py-1.5 text-sm font-medium text-sky-800 ring-1 ring-sky-200/60 transition hover:bg-sky-100"
      : "rounded-full bg-stone-100 px-3 py-1.5 text-sm font-medium text-stone-800 transition hover:bg-stone-200"

  return (
    <div className="space-y-10">
      <header className="space-y-3 border-b border-stone-200 pb-8">
        <p className="text-sm font-medium text-[var(--accent)]">{site.site_name}</p>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">文章</h1>
        <p className="text-stone-600">
          共 <span className="font-medium text-stone-800">{data.total}</span> 篇
          {tag ? (
            <>
              ，标签「<span className="font-medium text-stone-800">{tag}</span>」
            </>
          ) : null}
          {category ? (
            <>
              ，分类「<span className="font-medium text-stone-800">{category}</span>」
            </>
          ) : null}
        </p>
        {(tag || category) && (
          <Link
            href="/posts"
            className="inline-flex text-sm font-medium text-[var(--accent)] hover:underline"
          >
            清除筛选
          </Link>
        )}
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)] lg:items-start lg:gap-12">
        <aside className="space-y-8 rounded-[var(--radius-card)] border border-stone-200/90 bg-[var(--surface)] p-5 shadow-sm lg:sticky lg:top-24 lg:self-start">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500">分类</h2>
            <nav className="mt-3 flex flex-col gap-1" aria-label="按分类筛选">
              <Link href={tag ? `/posts?tag=${encodeURIComponent(tag)}` : "/posts"} className={categoryRow(!category)}>
                全部
              </Link>
              {categories.length === 0 ? (
                <span className="py-2 pl-3 text-sm text-stone-400">暂无分类</span>
              ) : (
                categories.map((c) => (
                  <Link
                    key={c.id}
                    href={`/posts?category=${encodeURIComponent(c.slug)}`}
                    className={categoryRow(category === c.slug)}
                  >
                    {c.name}
                  </Link>
                ))
              )}
            </nav>
          </div>
          <div className="border-t border-stone-100 pt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500">标签</h2>
            <nav className="mt-3 flex flex-wrap gap-2" aria-label="按标签筛选">
              <Link
                href={category ? `/posts?category=${encodeURIComponent(category)}` : "/posts"}
                className={tagPill(!tag)}
              >
                全部
              </Link>
              {tags.length === 0 ? (
                <span className="text-sm text-stone-400">暂无标签</span>
              ) : (
                tags.map((t) => (
                  <Link key={t.id} href={`/posts?tag=${encodeURIComponent(t.slug)}`} className={tagPill(tag === t.slug)}>
                    #{t.name}
                  </Link>
                ))
              )}
            </nav>
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
          {data.items.length === 0 ? (
            <p className="rounded-[var(--radius-card)] border border-dashed border-stone-200 bg-white py-12 text-center text-stone-500">
              暂无符合条件的文章。
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {data.items.map((p) => (
                <PostCard key={p.id} post={p} variant="row" />
              ))}
            </div>
          )}

          <PostsPagination
            page={page}
            totalPages={totalPages}
            hrefForPage={(p) => `/posts${buildQuery(filterBase, p)}`}
          />
        </div>
      </div>
    </div>
  )
}

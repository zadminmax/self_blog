import Link from "next/link"
import {
  fetchPostList,
  fetchDemoList,
  fetchServiceList,
  fetchSiteSettings,
  type PublicDemoListItem,
  type PublicPostListItem,
} from "@/lib/api"
import { PostCard } from "@/components/PostCard"
import { DemoCard } from "@/components/DemoCard"
import { HomeServiceGrid } from "@/components/HomeServiceGrid"

function collectUniqueTags(posts: PublicPostListItem[]) {
  const m = new Map<string, { name: string; slug: string }>()
  for (const p of posts) {
    for (const t of p.tags ?? []) {
      if (!m.has(t.slug)) m.set(t.slug, { name: t.name, slug: t.slug })
    }
  }
  return Array.from(m.values())
}

function collectUniqueCategories(posts: PublicPostListItem[]) {
  const m = new Map<string, { name: string; slug: string }>()
  for (const p of posts) {
    for (const c of p.categories ?? []) {
      if (!m.has(c.slug)) m.set(c.slug, { name: c.name, slug: c.slug })
    }
  }
  return Array.from(m.values())
}

export default async function HomePage() {
  const site = await fetchSiteSettings()
  let posts: PublicPostListItem[] = []
  let demoItems: PublicDemoListItem[] = []
  let services: Awaited<ReturnType<typeof fetchServiceList>> = []

  try {
    const data = await fetchPostList({ page: 1, pageSize: 18 })
    posts = data.items
  } catch {
    posts = []
  }

  try {
    const demos = await fetchDemoList(1, 3)
    demoItems = demos.items
  } catch {
    demoItems = []
  }

  try {
    services = await fetchServiceList()
  } catch {
    services = []
  }

  const tags = collectUniqueTags(posts)
  const categories = collectUniqueCategories(posts)
  const homePosts = posts.slice(0, 3)

  return (
    <div className="space-y-14 sm:space-y-16">
      <section className="grid gap-10 lg:grid-cols-[1fr_minmax(0,280px)] lg:items-end lg:gap-12">
        <div className="space-y-5">
          <p className="text-sm font-medium tracking-wide text-[var(--accent)]">
            {site.site_name}
            {site.site_tagline ? ` · ${site.site_tagline}` : ""}
          </p>
          <h1 className="text-balance text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl lg:text-[2.5rem] lg:leading-tight">
            {site.home_hero_title}
          </h1>
          <p className="max-w-xl text-pretty text-base leading-relaxed text-stone-600 sm:text-lg">
            {site.home_hero_lead}
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href="/posts"
              className="inline-flex items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--accent-hover)]"
            >
              {site.home_hero_btn_posts}
            </Link>
            <Link
              href="/demos"
              className="inline-flex items-center justify-center rounded-lg border border-stone-300 bg-[var(--surface)] px-5 py-2.5 text-sm font-medium text-stone-800 transition hover:border-stone-400 hover:bg-stone-50"
            >
              {site.home_hero_btn_demos}
            </Link>
          </div>
        </div>
        <div className="rounded-[var(--radius-card)] border border-stone-200/90 bg-[var(--surface)] p-5 shadow-sm sm:p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            {site.home_sidebar_nav_title}
          </h2>
          <ul className="mt-4 space-y-3 text-sm text-stone-700">
            <li className="flex justify-between gap-4 border-b border-stone-100 pb-3">
              <span className="text-stone-500">文章</span>
              <Link href="/posts" className="font-medium text-[var(--accent)] hover:underline">
                分类与标签筛选
              </Link>
            </li>
            <li className="flex justify-between gap-4 border-b border-stone-100 pb-3">
              <span className="text-stone-500">Demo</span>
              <Link href="/demos" className="font-medium text-[var(--accent)] hover:underline">
                按分类浏览原型
              </Link>
            </li>
            <li className="flex justify-between gap-4">
              <span className="text-stone-500">服务 / 关于</span>
              <span>
                <Link href="/services" className="font-medium text-[var(--accent)] hover:underline">
                  报价
                </Link>
                <span className="mx-2 text-stone-300">·</span>
                <Link href="/about" className="font-medium text-[var(--accent)] hover:underline">
                  简介
                </Link>
              </span>
            </li>
          </ul>
        </div>
      </section>

      {(tags.length > 0 || categories.length > 0) && (
        <section className="space-y-3.5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-lg font-semibold text-stone-900">{site.home_section_tags_title}</h2>
            <p className="text-sm text-stone-500">{site.home_section_tags_hint}</p>
          </div>
          <div className="flex flex-wrap gap-2.5" aria-label="标签与分类">
            {categories.map((c) => (
              <Link
                key={`c-${c.slug}`}
                href={`/posts?category=${encodeURIComponent(c.slug)}`}
                className="rounded-full border border-stone-200 bg-white px-3.5 py-2 text-sm text-stone-700 transition hover:border-stone-300 hover:bg-stone-50"
              >
                {c.name}
              </Link>
            ))}
            {tags.map((t) => (
              <Link
                key={`t-${t.slug}`}
                href={`/posts?tag=${encodeURIComponent(t.slug)}`}
                className="rounded-full bg-stone-100 px-3.5 py-2 text-sm font-normal text-[var(--accent)] transition hover:bg-stone-200/90"
              >
                #{t.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-xl font-semibold text-stone-900">{site.home_section_posts_title}</h2>
          <Link href="/posts" className="text-sm font-medium text-[var(--accent)] hover:underline">
            {site.home_section_posts_more}
          </Link>
        </div>
        {homePosts.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-dashed border-stone-300 bg-white/80 py-16 text-center text-stone-500">
            <p>暂无已发布文章。</p>
            <p className="mt-2 text-sm">启动后端并在后台发布内容后即可在此展示。</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {homePosts.map((p) => (
              <PostCard key={p.id} post={p} variant="row" />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-xl font-semibold text-stone-900">{site.home_section_demos_title}</h2>
          <Link href="/demos" className="text-sm font-medium text-[var(--accent)] hover:underline">
            {site.home_section_demos_more}
          </Link>
        </div>
        {demoItems.length === 0 ? (
          <p className="rounded-[var(--radius-card)] border border-dashed border-stone-200 bg-white py-10 text-center text-sm text-stone-500">
            暂无 Demo，可在管理后台添加。
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {demoItems.map((d) => (
              <DemoCard key={d.id} demo={d} openInNewTab={false} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-stone-900">{site.home_section_services_title}</h2>
            <p className="mt-1 text-sm text-stone-500">{site.home_section_services_sub}</p>
          </div>
          <Link href="/services" className="text-sm font-medium text-[var(--accent)] hover:underline">
            {site.home_section_services_more}
          </Link>
        </div>
        {services.length === 0 ? (
          <p className="rounded-[var(--radius-card)] border border-dashed border-stone-200 bg-white py-10 text-center text-sm text-stone-500">
            暂无服务内容，可在管理后台「技术服务」中维护。
          </p>
        ) : (
          <HomeServiceGrid services={services} limit={6} />
        )}
      </section>

      <section className="rounded-2xl bg-gradient-to-br from-[var(--accent)] to-sky-600 px-6 py-12 text-center shadow-md sm:px-10 sm:py-14">
        <h2 className="text-xl font-semibold text-white sm:text-2xl">{site.home_promo_title}</h2>
        <p className="mx-auto mt-3 max-w-lg text-pretty text-sm leading-relaxed text-blue-100 sm:text-base">
          {site.home_promo_lead}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/services"
            className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-[var(--accent)] shadow-sm transition hover:bg-blue-50"
          >
            {site.home_promo_btn_services}
          </Link>
          <Link
            href="/about"
            className="inline-flex items-center justify-center rounded-lg border border-white/35 px-5 py-2.5 text-sm font-medium text-white transition hover:border-white/60 hover:bg-white/10"
          >
            {site.home_promo_btn_about}
          </Link>
        </div>
      </section>
    </div>
  )
}

import type { Metadata } from "next"
import { fetchSiteSettings } from "@/lib/api"
import { SiteBrandMark } from "@/components/SiteBrandMark"
import { ArticleBody } from "@/components/ArticleBody"

export async function generateMetadata(): Promise<Metadata> {
  const s = await fetchSiteSettings()
  return {
    title: s.about_title,
    description: s.about_lead || s.meta_description,
  }
}

export default async function AboutPage() {
  const s = await fetchSiteSettings()
  const html = s.about_body_html?.trim()

  return (
    <div className="w-full space-y-12">
      <header className="space-y-4 border-b border-stone-200 pb-8">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">{s.about_title}</h1>
        <p className="text-pretty text-lg text-stone-600">{s.about_lead}</p>
      </header>

      <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:gap-10">
        <div
          className="mx-auto flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:mx-0"
          aria-hidden
        >
          <SiteBrandMark logoUrl={s.logo_url} size={88} />
        </div>
        <div className="min-w-0 flex-1 space-y-6">
          {html ? (
            <ArticleBody html={html} />
          ) : (
            <p className="text-sm text-stone-500">请在管理后台「站点设置」中编辑关于页正文（Markdown）。</p>
          )}
        </div>
      </div>
    </div>
  )
}

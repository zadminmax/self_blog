import { fetchDemoBySlug, resolveMediaUrl } from "@/lib/api"
import { notFound } from "next/navigation"

type Props = { params: { slug: string } }

export const metadata = {
  title: "Demo",
}

export default async function DemoDetailPage({ params }: Props) {
  const demo = await fetchDemoBySlug(params.slug)
  if (!demo) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">{demo.name}</h1>
        {demo.category?.name ? <p className="mt-2 text-sm text-stone-600">分类：{demo.category.name}</p> : null}
        {demo.description ? <p className="mt-3 text-stone-700">{demo.description}</p> : null}
      </div>

      {demo.cover_url ? (
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-stone-200 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={resolveMediaUrl(demo.cover_url)} alt="" className="h-auto w-full object-cover" />
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="bg-stone-50 px-4 py-3 text-sm text-stone-600">运行 Demo（iframe）</div>
        <iframe
          src={demo.entry_url}
          style={{ width: "100%", height: 720, border: 0 }}
          loading="lazy"
          title={demo.name}
        />
      </div>
    </div>
  )
}


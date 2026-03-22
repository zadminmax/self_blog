import { fetchServiceList, resolveMediaUrl, type PublicServiceOffer } from "@/lib/api"

export const metadata = {
  title: "技术服务",
  description: "我们提供的技术服务与报价",
}

function groupByCategory(items: PublicServiceOffer[]) {
  const map = new Map<string, PublicServiceOffer[]>()
  for (const s of items) {
    const key = s.category?.trim() || "其他"
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(s)
  }
  const keys = Array.from(map.keys()).sort((a, b) => a.localeCompare(b, "zh-CN"))
  return keys.map((name) => ({ name, items: map.get(name)! }))
}

export default async function ServicesPage() {
  let items: PublicServiceOffer[] = []
  try {
    items = await fetchServiceList()
  } catch {
    items = []
  }

  const groups = groupByCategory(items)

  return (
    <div className="space-y-12">
      <header className="space-y-3 border-b border-stone-200 pb-8">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">服务与报价</h1>
        <p className="max-w-2xl text-pretty text-stone-600">服务说明、交付内容与参考报价。具体以沟通为准。</p>
      </header>

      {groups.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-200 bg-white py-12 text-center text-stone-500">
          暂无服务内容。
        </p>
      ) : (
        <div className="space-y-14">
          {groups.map((g) => (
            <section key={g.name} className="space-y-6">
              <h2 className="text-lg font-semibold text-stone-800">{g.name}</h2>
              <div className="grid gap-6 lg:grid-cols-2">
                {g.items.map((s) => (
                  <article
                    key={s.id}
                    id={`service-${s.slug}`}
                    className="scroll-mt-24 flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-stone-200/90 bg-[var(--surface)] shadow-sm"
                  >
                    {s.cover_url ? (
                      <div className="aspect-[2/1] w-full shrink-0 overflow-hidden bg-stone-100 sm:aspect-[21/9]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={resolveMediaUrl(s.cover_url)}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ) : null}
                    <div className="flex flex-1 flex-col gap-3 p-5 sm:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <h3 className="text-xl font-semibold text-stone-900">{s.name}</h3>
                        {s.price_text ? (
                          <span className="shrink-0 rounded-lg bg-blue-50 px-3 py-1 text-sm font-semibold text-[var(--accent)]">
                            {s.price_text}
                          </span>
                        ) : null}
                      </div>
                      {s.featured ? (
                        <span className="w-fit rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                          推荐
                        </span>
                      ) : null}
                      {s.summary ? <p className="text-sm leading-relaxed text-stone-600">{s.summary}</p> : null}
                      {s.content_html ? (
                        <div
                          className="prose prose-sm max-w-none border-t border-stone-100 pt-4 text-stone-700 prose-headings:text-stone-900 prose-a:text-[var(--accent)]"
                          dangerouslySetInnerHTML={{ __html: s.content_html }}
                        />
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

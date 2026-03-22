import { fetchDemoList, type PublicDemoListItem } from "@/lib/api"
import { DemoCard } from "@/components/DemoCard"

export const metadata = {
  title: "Demo",
  description: "可运行的 Demo 原型集合",
}

async function fetchAllDemos(): Promise<PublicDemoListItem[]> {
  const out: PublicDemoListItem[] = []
  let page = 1
  const pageSize = 50
  try {
    for (;;) {
      const data = await fetchDemoList(page, pageSize)
      out.push(...data.items)
      if (data.items.length < pageSize || out.length >= data.total) break
      page++
      if (page > 40) break
    }
  } catch {
    return []
  }
  return out
}

function groupByCategory(items: PublicDemoListItem[]) {
  const map = new Map<string, PublicDemoListItem[]>()
  for (const d of items) {
    const key = d.category?.name?.trim() || "未分类"
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(d)
  }
  const keys = Array.from(map.keys()).sort((a, b) => {
    if (a === "未分类") return 1
    if (b === "未分类") return -1
    return a.localeCompare(b, "zh-CN")
  })
  return keys.map((name) => ({ name, items: map.get(name)! }))
}

export default async function DemosPage() {
  const items = await fetchAllDemos()
  const groups = groupByCategory(items)

  return (
    <div className="space-y-12">
      <header className="space-y-3 border-b border-stone-200 pb-8">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">Demo</h1>
        <p className="max-w-2xl text-pretty text-stone-600">
          按分类浏览项目原型。卡片展示标题、封面与简介；点击在新标签页打开运行页。
        </p>
        <p className="text-sm text-stone-500">共 {items.length} 个</p>
      </header>

      {groups.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-200 bg-white py-12 text-center text-stone-500">
          暂无 Demo。
        </p>
      ) : (
        <div className="space-y-14">
          {groups.map((g) => (
            <section key={g.name} className="space-y-5">
              <div className="flex flex-wrap items-baseline gap-3 border-b border-stone-100 pb-3">
                <h2 className="text-xl font-semibold text-stone-900">{g.name}</h2>
                <span className="text-sm text-stone-500">{g.items.length} 项</span>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {g.items.map((d) => (
                  <DemoCard key={d.id} demo={d} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

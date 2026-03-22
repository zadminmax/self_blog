import Link from "next/link"

type Props = {
  page: number
  totalPages: number
  /** 生成第 p 页的链接（含筛选参数） */
  hrefForPage: (p: number) => string
}

/** 生成带省略的页码序列，例如 1 … 4 5 6 … 20 */
function pageSequence(current: number, total: number): (number | "…")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const set = new Set<number>()
  set.add(1)
  set.add(total)
  for (let i = current - 1; i <= current + 1; i++) {
    if (i >= 1 && i <= total) set.add(i)
  }
  const sorted = Array.from(set).sort((a, b) => a - b)
  const out: (number | "…")[] = []
  let prev = 0
  for (const p of sorted) {
    if (prev > 0 && p - prev > 1) out.push("…")
    out.push(p)
    prev = p
  }
  return out
}

const btnBase =
  "inline-flex min-w-[2.25rem] items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition"
const btnIdle = "border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50"
const btnActive = "border-[var(--accent)] bg-blue-50 text-[var(--accent)]"
const btnDisabled = "cursor-not-allowed border-stone-100 bg-stone-50 text-stone-300"

export function PostsPagination({ page, totalPages, hrefForPage }: Props) {
  if (totalPages <= 1) return null

  const items = pageSequence(page, totalPages)

  return (
    <nav className="border-t border-stone-100 pt-8" aria-label="分页">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between sm:gap-6">
        <p className="order-2 text-sm text-stone-500 sm:order-1">
          第 <span className="font-medium text-stone-700">{page}</span> / {totalPages} 页
        </p>
        <div className="order-1 flex flex-wrap items-center justify-center gap-1.5 sm:order-2">
          {page <= 1 ? (
            <span className={`${btnBase} ${btnDisabled}`} aria-disabled>
              上一页
            </span>
          ) : (
            <Link href={hrefForPage(page - 1)} className={`${btnBase} ${btnIdle}`}>
              上一页
            </Link>
          )}

          {items.map((item, idx) =>
            item === "…" ? (
              <span key={`e-${idx}`} className="px-1 text-stone-400" aria-hidden>
                …
              </span>
            ) : item === page ? (
              <span
                key={item}
                className={`${btnBase} ${btnActive}`}
                aria-current="page"
                aria-label={`第 ${item} 页`}
              >
                {item}
              </span>
            ) : (
              <Link key={item} href={hrefForPage(item)} className={`${btnBase} ${btnIdle}`}>
                {item}
              </Link>
            ),
          )}

          {page >= totalPages ? (
            <span className={`${btnBase} ${btnDisabled}`} aria-disabled>
              下一页
            </span>
          ) : (
            <Link href={hrefForPage(page + 1)} className={`${btnBase} ${btnIdle}`}>
              下一页
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}

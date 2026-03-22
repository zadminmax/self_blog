export default function Loading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-stone-500">
      <div
        className="h-9 w-9 animate-spin rounded-full border-2 border-stone-200 border-t-[var(--accent)]"
        aria-hidden
      />
      <p className="text-sm">加载中…</p>
    </div>
  )
}

"use client"

import { useEffect } from "react"

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="mx-auto max-w-lg space-y-6 py-16 text-center">
      <h1 className="text-xl font-semibold text-stone-900">页面加载出错</h1>
      <p className="text-sm leading-relaxed text-stone-600">
        {error.message || "发生未知错误。若刚改过环境变量，请重启 dev 服务器。"}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[var(--accent-hover)]"
      >
        重试
      </button>
    </div>
  )
}

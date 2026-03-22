import Link from "next/link"

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-semibold text-stone-900">页面不存在</h1>
      <p className="mt-2 text-stone-600">链接可能已失效。</p>
      <Link href="/" className="mt-6 inline-block text-blue-600 hover:underline">
        返回首页
      </Link>
    </div>
  )
}

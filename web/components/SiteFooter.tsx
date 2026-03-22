import Link from "next/link"

export function SiteFooter({ footerLine }: { footerLine: string }) {
  return (
    <footer className="mt-auto border-t border-stone-200 bg-white py-10 text-sm text-stone-500">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
        <p>{footerLine}</p>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          <Link href="/posts" className="hover:text-stone-800">
            文章
          </Link>
          <Link href="/demos" className="hover:text-stone-800">
            Demo
          </Link>
          <Link href="/about" className="hover:text-stone-800">
            关于
          </Link>
        </div>
      </div>
    </footer>
  )
}

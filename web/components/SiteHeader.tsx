"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { SiteLogo } from "@/components/SiteLogo"
import { resolveMediaUrl } from "@/lib/api"

const links = [
  { href: "/", label: "首页" },
  { href: "/posts", label: "文章" },
  { href: "/demos", label: "Demo" },
  { href: "/services", label: "服务" },
  { href: "/about", label: "关于" },
]

type Props = {
  siteName: string
  logoUrl?: string
}

export function SiteHeader({ siteName, logoUrl }: Props) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const extLogo = logoUrl?.trim()

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/90 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-stone-900 transition hover:text-[var(--accent)]"
        >
          {extLogo ? (
            <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-stone-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resolveMediaUrl(extLogo)} alt="" className="max-h-full max-w-full object-contain" />
            </span>
          ) : (
            <SiteLogo size={34} className="shrink-0" />
          )}
          <span className="leading-tight">{siteName}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="主导航">
          {links.map((l) => {
            const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href))
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-sky-50 text-sky-800"
                    : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                }`}
              >
                {l.label}
              </Link>
            )
          })}
        </nav>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-700 md:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? "关闭菜单" : "打开菜单"}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span className="sr-only">菜单</span>
          {menuOpen ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      <div
        id="mobile-nav"
        className={`border-t border-stone-100 bg-white md:hidden ${menuOpen ? "block" : "hidden"}`}
      >
        <nav className="mx-auto flex max-w-6xl flex-col gap-0.5 px-4 py-3 sm:px-6" aria-label="移动端导航">
          {links.map((l) => {
            const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href))
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-3 text-sm font-medium ${
                  active ? "bg-sky-50 text-sky-800" : "text-stone-600 hover:bg-stone-50"
                }`}
              >
                {l.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}

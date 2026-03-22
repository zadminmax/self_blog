import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { fetchSiteSettings } from "@/lib/api"
import { SiteHeader } from "@/components/SiteHeader"
import { SiteFooter } from "@/components/SiteFooter"

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
})

function resolveMetadataBase(): URL {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").trim()
  if (!raw) return new URL("http://localhost:3000")
  try {
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      return new URL(raw)
    }
    return new URL(`http://${raw}`)
  } catch {
    return new URL("http://localhost:3000")
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const s = await fetchSiteSettings()
  const name = s.site_name
  return {
    metadataBase: resolveMetadataBase(),
    title: {
      default: name,
      template: `%s · ${name}`,
    },
    description: s.meta_description,
    openGraph: {
      type: "website",
      locale: "zh_CN",
      siteName: name,
      description: s.meta_description,
    },
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const s = await fetchSiteSettings()

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} flex min-h-screen flex-col bg-stone-50 font-sans antialiased text-stone-900`}
      >
        <SiteHeader siteName={s.site_name} logoUrl={s.logo_url || undefined} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">{children}</main>
        <SiteFooter footerLine={s.footer_line} />
      </body>
    </html>
  )
}

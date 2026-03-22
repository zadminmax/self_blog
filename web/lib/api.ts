/** 服务端优先读 API_URL（Docker 内网），浏览器侧可配 NEXT_PUBLIC_API_URL */
export function apiBase(): string {
  const u =
    (typeof window === "undefined" ? process.env.API_URL : undefined)?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim()
  if (u) return u.replace(/\/$/, "")
  return "http://127.0.0.1:8080"
}

export type PublicPostListItem = {
  id: number
  title: string
  slug: string
  excerpt: string
  cover_url: string
  content_type: string
  published_at?: string
  categories?: { id: number; name: string; slug: string }[]
  tags?: { id: number; name: string; slug: string }[]
}

export type PublicPostDetail = PublicPostListItem & {
  body_html: string
  updated_at?: string
}

type ListResp = {
  items: PublicPostListItem[]
  total: number
  page: number
  page_size: number
}

type ApiEnvelope<T> = { code: number; message: string; data: T }

/** 服务端请求 API 的超时（毫秒），避免后端不可达时整页长时间卡在 RSC 等待 */
const API_FETCH_TIMEOUT_MS = 12_000

function apiFetch(input: string | URL, init?: RequestInit & { next?: { revalidate?: number } }) {
  if (typeof window === "undefined" && typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
    return fetch(input, { ...init, signal: AbortSignal.timeout(API_FETCH_TIMEOUT_MS) })
  }
  return fetch(input, init)
}

async function parseJSON<T>(res: Response): Promise<T> {
  const j = (await res.json()) as ApiEnvelope<T>
  if (!res.ok || j.code !== 0) {
    throw new Error(j.message || res.statusText)
  }
  return j.data
}

/** 将后台返回的相对资源路径转为可请求的绝对地址 */
export function resolveMediaUrl(url: string): string {
  if (!url) return ""
  if (url.startsWith("http")) return url
  return `${apiBase()}${url.startsWith("/") ? "" : "/"}${url}`
}

export type FetchPostListOpts = {
  page?: number
  pageSize?: number
  tag?: string
  category?: string
  content_type?: string
}

export type PublicCategory = { id: number; name: string; slug: string }
export type PublicTag = { id: number; name: string; slug: string }

export async function fetchCategoryList(): Promise<PublicCategory[]> {
  const res = await apiFetch(`${apiBase()}/api/v1/public/categories`, { next: { revalidate: 120 } })
  return parseJSON<PublicCategory[]>(res)
}

export async function fetchTagList(): Promise<PublicTag[]> {
  const res = await apiFetch(`${apiBase()}/api/v1/public/tags`, { next: { revalidate: 120 } })
  return parseJSON<PublicTag[]>(res)
}

export async function fetchPostList(
  pageOrOpts: number | FetchPostListOpts = 1,
  pageSizeArg = 12
): Promise<ListResp> {
  let page = 1
  let pageSize = 12
  let tag: string | undefined
  let category: string | undefined
  let content_type: string | undefined

  if (typeof pageOrOpts === "object") {
    page = pageOrOpts.page ?? 1
    pageSize = pageOrOpts.pageSize ?? 12
    tag = pageOrOpts.tag
    category = pageOrOpts.category
    content_type = pageOrOpts.content_type
  } else {
    page = pageOrOpts
    pageSize = pageSizeArg
  }

  const url = new URL(`${apiBase()}/api/v1/public/posts`)
  url.searchParams.set("page", String(page))
  url.searchParams.set("page_size", String(pageSize))
  if (tag) url.searchParams.set("tag", tag)
  if (category) url.searchParams.set("category", category)
  if (content_type) url.searchParams.set("content_type", content_type)
  const res = await apiFetch(url.toString(), { next: { revalidate: 60 } })
  return parseJSON<ListResp>(res)
}

export async function fetchPostBySlug(slug: string): Promise<PublicPostDetail | null> {
  const res = await apiFetch(`${apiBase()}/api/v1/public/posts/${encodeURIComponent(slug)}`, {
    next: { revalidate: 60 },
  })
  if (res.status === 404) return null
  return parseJSON<PublicPostDetail>(res)
}

export async function fetchAllPostSlugs(max = 500): Promise<string[]> {
  const out: string[] = []
  let page = 1
  const pageSize = 100
  for (;;) {
    const data = await fetchPostList(page, pageSize)
    for (const p of data.items) {
      out.push(p.slug)
    }
    if (data.items.length < pageSize || out.length >= data.total || out.length >= max) break
    page++
  }
  return out
}

export type DemoCategory = { id: number; name: string; slug: string }
export type PublicDemoListItem = {
  id: number
  name: string
  slug: string
  description: string
  cover_url: string
  category?: DemoCategory | null
}

export type PublicDemoDetail = PublicDemoListItem & {
  entry_url: string
}

type DemoListResp = {
  items: PublicDemoListItem[]
  total: number
  page: number
  page_size: number
}

export async function fetchDemoList(
  page = 1,
  pageSize = 12,
  categoryId?: number
): Promise<DemoListResp> {
  const url = new URL(`${apiBase()}/api/v1/public/demos`)
  url.searchParams.set("page", String(page))
  url.searchParams.set("page_size", String(pageSize))
  if (categoryId != null && categoryId > 0) {
    url.searchParams.set("category_id", String(categoryId))
  }
  const res = await apiFetch(url.toString(), { next: { revalidate: 60 } })
  return parseJSON<DemoListResp>(res)
}

export async function fetchDemoBySlug(slug: string): Promise<PublicDemoDetail | null> {
  const res = await apiFetch(`${apiBase()}/api/v1/public/demos/${encodeURIComponent(slug)}`, {
    next: { revalidate: 60 },
  })
  if (res.status === 404) return null
  return parseJSON<PublicDemoDetail>(res)
}

export type PublicServiceOffer = {
  id: number
  name: string
  slug: string
  category: string
  price_text: string
  summary: string
  content: string
  content_html: string
  cover_url: string
  sort_order?: number
  featured: boolean
  enabled: boolean
}

export async function fetchServiceList(): Promise<PublicServiceOffer[]> {
  const res = await apiFetch(`${apiBase()}/api/v1/public/services`, { next: { revalidate: 60 } })
  return parseJSON<PublicServiceOffer[]>(res)
}

export type PublicSiteSettings = {
  site_name: string
  site_tagline: string
  meta_description: string
  logo_url: string
  footer_line: string
  about_title: string
  about_lead: string
  about_body_html: string
}

const FALLBACK_SITE: PublicSiteSettings = {
  site_name: "波波技术栈",
  site_tagline: "技术笔记 · 实践与方案",
  meta_description: "个人技术博客：文章、方案与实践记录",
  logo_url: "",
  footer_line: "波波技术栈 · 个人技术博客 · Go + Next.js",
  about_title: "关于",
  about_lead: "波波技术栈 — 全栈实践、写作与可运行原型。",
  about_body_html: "",
}

/** 全站展示用配置（失败时使用 FALLBACK，不抛错） */
export async function fetchSiteSettings(): Promise<PublicSiteSettings> {
  try {
    const res = await apiFetch(`${apiBase()}/api/v1/public/site-settings`, { next: { revalidate: 60 } })
    const data = await parseJSON<PublicSiteSettings>(res)
    return {
      site_name: data.site_name?.trim() || FALLBACK_SITE.site_name,
      site_tagline: data.site_tagline?.trim() || FALLBACK_SITE.site_tagline,
      meta_description: data.meta_description?.trim() || FALLBACK_SITE.meta_description,
      logo_url: data.logo_url?.trim() || "",
      footer_line: data.footer_line?.trim() || FALLBACK_SITE.footer_line,
      about_title: data.about_title?.trim() || FALLBACK_SITE.about_title,
      about_lead: data.about_lead?.trim() || FALLBACK_SITE.about_lead,
      about_body_html: data.about_body_html ?? "",
    }
  } catch {
    return { ...FALLBACK_SITE }
  }
}

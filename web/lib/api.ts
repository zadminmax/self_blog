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
  home_hero_title: string
  home_hero_lead: string
  home_hero_btn_posts: string
  home_hero_btn_demos: string
  home_sidebar_nav_title: string
  home_section_tags_title: string
  home_section_tags_hint: string
  home_section_posts_title: string
  home_section_posts_more: string
  home_section_demos_title: string
  home_section_demos_more: string
  home_section_services_title: string
  home_section_services_sub: string
  home_section_services_more: string
  home_promo_title: string
  home_promo_lead: string
  home_promo_btn_services: string
  home_promo_btn_about: string
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
  home_hero_title: "文章、Demo 与技术服务，一套界面多端适配",
  home_hero_lead:
    "聚焦可落地的方案与可运行的示例，数据来自自建 API；首页展示最新文章摘要、精选 Demo 与报价服务入口。",
  home_hero_btn_posts: "全部文章",
  home_hero_btn_demos: "浏览 Demo",
  home_sidebar_nav_title: "站内导览",
  home_section_tags_title: "标签与分类",
  home_section_tags_hint: "点击可筛选文章列表",
  home_section_posts_title: "最新文章",
  home_section_posts_more: "查看全部",
  home_section_demos_title: "精选 Demo",
  home_section_demos_more: "全部 Demo",
  home_section_services_title: "服务内容",
  home_section_services_sub: "按后台排序展示前 6 项，完整说明见服务页",
  home_section_services_more: "服务与报价",
  home_promo_title: "需要定制开发或技术咨询？",
  home_promo_lead:
    "查看报价与交付说明，或通过关于页了解背景与联系方式（可按你的实际业务再扩展）。",
  home_promo_btn_services: "查看服务报价",
  home_promo_btn_about: "关于我",
}

/** 全站展示用配置（失败时使用 FALLBACK，不抛错） */
export async function fetchSiteSettings(): Promise<PublicSiteSettings> {
  try {
    const res = await apiFetch(`${apiBase()}/api/v1/public/site-settings`, { next: { revalidate: 60 } })
    const data = await parseJSON<PublicSiteSettings>(res)
    const pick = (v: string | undefined, fb: string) => (v?.trim() ? v.trim() : fb)
    return {
      site_name: pick(data.site_name, FALLBACK_SITE.site_name),
      site_tagline: pick(data.site_tagline, FALLBACK_SITE.site_tagline),
      meta_description: pick(data.meta_description, FALLBACK_SITE.meta_description),
      logo_url: data.logo_url?.trim() || "",
      footer_line: pick(data.footer_line, FALLBACK_SITE.footer_line),
      about_title: pick(data.about_title, FALLBACK_SITE.about_title),
      about_lead: pick(data.about_lead, FALLBACK_SITE.about_lead),
      about_body_html: data.about_body_html ?? "",
      home_hero_title: pick(data.home_hero_title, FALLBACK_SITE.home_hero_title),
      home_hero_lead: pick(data.home_hero_lead, FALLBACK_SITE.home_hero_lead),
      home_hero_btn_posts: pick(data.home_hero_btn_posts, FALLBACK_SITE.home_hero_btn_posts),
      home_hero_btn_demos: pick(data.home_hero_btn_demos, FALLBACK_SITE.home_hero_btn_demos),
      home_sidebar_nav_title: pick(data.home_sidebar_nav_title, FALLBACK_SITE.home_sidebar_nav_title),
      home_section_tags_title: pick(data.home_section_tags_title, FALLBACK_SITE.home_section_tags_title),
      home_section_tags_hint: pick(data.home_section_tags_hint, FALLBACK_SITE.home_section_tags_hint),
      home_section_posts_title: pick(data.home_section_posts_title, FALLBACK_SITE.home_section_posts_title),
      home_section_posts_more: pick(data.home_section_posts_more, FALLBACK_SITE.home_section_posts_more),
      home_section_demos_title: pick(data.home_section_demos_title, FALLBACK_SITE.home_section_demos_title),
      home_section_demos_more: pick(data.home_section_demos_more, FALLBACK_SITE.home_section_demos_more),
      home_section_services_title: pick(
        data.home_section_services_title,
        FALLBACK_SITE.home_section_services_title
      ),
      home_section_services_sub: pick(
        data.home_section_services_sub,
        FALLBACK_SITE.home_section_services_sub
      ),
      home_section_services_more: pick(
        data.home_section_services_more,
        FALLBACK_SITE.home_section_services_more
      ),
      home_promo_title: pick(data.home_promo_title, FALLBACK_SITE.home_promo_title),
      home_promo_lead: pick(data.home_promo_lead, FALLBACK_SITE.home_promo_lead),
      home_promo_btn_services: pick(data.home_promo_btn_services, FALLBACK_SITE.home_promo_btn_services),
      home_promo_btn_about: pick(data.home_promo_btn_about, FALLBACK_SITE.home_promo_btn_about),
    }
  } catch {
    return { ...FALLBACK_SITE }
  }
}

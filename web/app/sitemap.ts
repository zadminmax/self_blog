import type { MetadataRoute } from "next"
import { fetchAllPostSlugs } from "@/lib/api"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  const normalized = base.replace(/\/$/, "")

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${normalized}/`, lastModified: new Date() },
    { url: `${normalized}/posts`, lastModified: new Date() },
    { url: `${normalized}/about`, lastModified: new Date() },
  ]

  try {
    const slugs = await fetchAllPostSlugs()
    const posts: MetadataRoute.Sitemap = slugs.map((slug) => ({
      url: `${normalized}/posts/${slug}`,
      lastModified: new Date(),
    }))
    return [...staticPages, ...posts]
  } catch {
    return staticPages
  }
}

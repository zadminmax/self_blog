type Props = { html: string }

/** 正文已由后端 bluemonday 净化；仍建议仅信任自建 API */
export function ArticleBody({ html }: Props) {
  if (!html) return null
  return (
    <div
      className="prose prose-stone max-w-none prose-pre:bg-stone-900 prose-pre:text-stone-100 prose-a:text-blue-600"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

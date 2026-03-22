"use client"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, padding: 24, fontFamily: "system-ui, sans-serif", background: "#fafaf9", color: "#1c1917" }}>
        <h1 style={{ fontSize: "1.25rem" }}>站点出错</h1>
        <p style={{ color: "#57534e", fontSize: "0.875rem", marginTop: 12 }}>{error.message || "请查看终端或浏览器控制台。"}</p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            marginTop: 20,
            padding: "10px 20px",
            borderRadius: 8,
            border: "none",
            background: "#1d4ed8",
            color: "#fff",
            cursor: "pointer",
            fontSize: "0.875rem",
          }}
        >
          重试
        </button>
      </body>
    </html>
  )
}

import { useEffect, useRef } from 'react'
import Vditor from 'vditor'
import 'vditor/dist/index.css'

type Props = {
  initialValue: string
  onChange?: (v: string) => void
  height?: number
  /** 切换文章时变更以重建编辑器 */
  instanceKey?: string
  /** Vditor 上传图片时附带额外的表单字段（例如文章内图片分类） */
  uploadExtraData?: Record<string, string | Blob>
}

export function MarkdownEditor({ initialValue, onChange, height = 420, instanceKey = 'default', uploadExtraData }: Props) {
  const elRef = useRef<HTMLDivElement>(null)
  const onChangeRef = useRef(onChange)
  const vdRef = useRef<Vditor | null>(null)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!elRef.current) return
    const vd = new Vditor(elRef.current, {
      height,
      value: initialValue,
      placeholder: '支持 Markdown，可粘贴图片上传…',
      upload: {
        accept: 'image/*',
        fieldName: 'file',
        url: `${import.meta.env.VITE_API_URL || ''}/api/v1/admin/media`,
        setHeaders: () => ({
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        }),
        extraData: uploadExtraData,
        format(files, responseText) {
          try {
            const j = JSON.parse(responseText) as { code: number; data?: { url: string } }
            if (j.code !== 0 || !j.data?.url) return ''
            const fileName = files?.[0]?.name || 'image'
            return JSON.stringify({
              msg: '',
              code: 0,
              data: {
                errFiles: [],
                succMap: {
                  [fileName]: j.data.url,
                },
              },
            })
          } catch {
            return ''
          }
        },
      },
      input: (v) => onChangeRef.current?.(v),
      cache: { enable: false },
    })
    vdRef.current = vd
    return () => {
      try {
        vd.destroy()
      } catch {
        // Vditor 在某些生命周期（快速切换/热更新）下 destroy 可能报错，避免影响页面渲染
      }
      vdRef.current = null
    }
  }, [instanceKey, height])

  return <div ref={elRef} className="vditor-wrap" />
}

import { useEffect, useState } from 'react'
import { Slider } from 'antd'

type Props = {
  trackWidth: number
  captchaId: string
  /** 0…trackWidth，与后端校验一致 */
  onSlideX: (x: number) => void
  resetKey: number
}

/**
 * 使用 Ant Design Slider（项目已依赖 antd，无需再引 Tailwind）。
 * 说明：此前自定义滑块写了 Tailwind 类名，但 admin 未接入 Tailwind，导致轨道/手柄样式不生效、几乎看不见。
 */
export function LoginSliderCaptcha({ trackWidth, captchaId, onSlideX, resetKey }: Props) {
  const trackPx = trackWidth > 0 ? trackWidth : 300
  const [pos, setPos] = useState(0)

  useEffect(() => {
    setPos(0)
    onSlideX(0)
  }, [captchaId, resetKey, onSlideX])

  const done = pos >= trackPx - 1

  return (
    <div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>拖动滑块到最右侧完成验证</div>
      <div
        style={{
          width: '100%',
          maxWidth: Math.min(trackPx + 48, 340),
          padding: '6px 4px 14px',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
          background: '#f8fafc',
        }}
      >
        <Slider
          min={0}
          max={trackPx}
          step={1}
          value={pos}
          tooltip={{
            formatter: (v) => (v !== undefined && v >= trackPx - 2 ? '完成' : `${v ?? 0} / ${trackPx}`),
          }}
          onChange={(v) => {
            setPos(v)
            onSlideX(v)
          }}
          onChangeComplete={(v) => onSlideX(v)}
        />
      </div>
      {done ? (
        <p style={{ margin: '10px 0 0', fontSize: 12, color: '#16a34a' }}>已拖至末端，可点击登录</p>
      ) : (
        <p style={{ margin: '10px 0 0', fontSize: 12, color: '#94a3b8' }}>请拖满整条滑条</p>
      )}
    </div>
  )
}

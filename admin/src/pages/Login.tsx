import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Form, Input, Typography, message } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import api, { unwrap } from '../services/api'
import { LoginSliderCaptcha } from '../components/LoginSliderCaptcha'

type CaptchaPayload = { captcha_id: string; track_width: number }

export default function LoginPage() {
  const { login, token } = useAuth()
  const nav = useNavigate()
  const [siteTitle, setSiteTitle] = useState('波波技术栈')
  const [captcha, setCaptcha] = useState<CaptchaPayload | null>(null)
  const [captchaLoading, setCaptchaLoading] = useState(true)
  const [slideX, setSlideX] = useState(0)
  const [sliderReset, setSliderReset] = useState(0)

  const loadCaptcha = useCallback(async () => {
    setCaptchaLoading(true)
    try {
      const res = await api.get('/api/v1/public/slider-captcha')
      const data = unwrap<CaptchaPayload>(res)
      setCaptcha(data)
      setSlideX(0)
      setSliderReset((k) => k + 1)
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '加载验证失败')
      setCaptcha(null)
    } finally {
      setCaptchaLoading(false)
    }
  }, [])

  useEffect(() => {
    const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
    void fetch(`${base}/api/v1/public/site-settings`)
      .then((r) => r.json() as Promise<{ code: number; data?: { site_name?: string } }>)
      .then((j) => {
        if (j.code === 0 && j.data?.site_name) setSiteTitle(j.data.site_name)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    void loadCaptcha()
  }, [loadCaptcha])

  useEffect(() => {
    if (token) {
      nav('/posts', { replace: true })
    }
  }, [token, nav])

  const onFinish = async (v: { username: string; password: string }) => {
    if (!captcha?.captcha_id) {
      message.error('验证未就绪，请稍后重试')
      return
    }
    if (slideX < 1) {
      message.error('请先将滑块拖至右侧')
      return
    }
    try {
      await login(v.username, v.password, { captcha_id: captcha.captcha_id, slide_x: slideX })
      message.success('登录成功')
      nav('/posts', { replace: true })
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '登录失败')
      await loadCaptcha()
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(circle at 20% 20%, rgba(37,99,235,.14), transparent 40%), radial-gradient(circle at 80% 70%, rgba(29,78,216,.12), transparent 45%), #eef3fb',
      }}
    >
      <Card
        className="admin-card"
        style={{ width: 420 }}
        title={
          <Typography.Title level={4} style={{ margin: 0 }}>
            {siteTitle} 管理后台
          </Typography.Title>
        }
      >
        <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
          默认账号见项目 README（请及时修改密码）
        </Typography.Paragraph>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
            <Input autoComplete="username" prefix={<UserOutlined />} />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true }]}>
            <Input.Password autoComplete="current-password" prefix={<LockOutlined />} />
          </Form.Item>

          <div style={{ marginBottom: 16 }}>
            {captchaLoading || !captcha ? (
              <Typography.Text type="secondary">正在加载验证…</Typography.Text>
            ) : (
              <LoginSliderCaptcha
                trackWidth={captcha.track_width}
                captchaId={captcha.captcha_id}
                resetKey={sliderReset}
                onSlideX={setSlideX}
              />
            )}
          </div>

          <Button type="primary" htmlType="submit" block disabled={captchaLoading || !captcha}>
            登录
          </Button>
        </Form>
      </Card>
    </div>
  )
}

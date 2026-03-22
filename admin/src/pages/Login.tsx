import { useEffect, useState } from 'react'
import { Button, Card, Form, Input, Typography, message } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'

export default function LoginPage() {
  const { login, token } = useAuth()
  const nav = useNavigate()
  const [siteTitle, setSiteTitle] = useState('波波技术栈')

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
    if (token) {
      nav('/posts', { replace: true })
    }
  }, [token, nav])

  const onFinish = async (v: { username: string; password: string }) => {
    try {
      await login(v.username, v.password)
      message.success('登录成功')
      nav('/posts', { replace: true })
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '登录失败')
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
          <Button type="primary" htmlType="submit" block>
            登录
          </Button>
        </Form>
      </Card>
    </div>
  )
}

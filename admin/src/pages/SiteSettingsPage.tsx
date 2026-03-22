import { useEffect, useState } from 'react'
import { Button, Card, Divider, Form, Input, Space, message } from 'antd'
import api, { unwrap } from '../services/api'
import { MarkdownEditor } from '../components/editor/MarkdownEditor'

type Row = {
  id: number
  site_name: string
  site_tagline: string
  meta_description: string
  logo_url: string
  footer_line: string
  about_title: string
  about_lead: string
  about_body: string
}

export default function SiteSettingsPage() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [aboutMd, setAboutMd] = useState('')
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/v1/admin/site-settings')
      const row = unwrap<Row>(res)
      form.setFieldsValue(row)
      setAboutMd(row.about_body || '')
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const submit = async () => {
    try {
      const v = await form.validateFields()
      setSaving(true)
      await api.put('/api/v1/admin/site-settings', { ...v, about_body: aboutMd })
      message.success('已保存')
      await load()
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'errorFields' in e) return
      message.error(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="admin-card" loading={loading}>
      <div className="admin-toolbar">
        <div>
          <h2 className="admin-page-title">站点设置</h2>
          <p className="admin-page-subtitle">
            站点名称、SEO、Logo、页脚与关于页；前台通过公开接口读取（需账号具备 site:manage 权限）
          </p>
        </div>
        <Button type="primary" loading={saving} onClick={() => void submit()}>
          保存
        </Button>
      </div>

      <Form form={form} layout="vertical" style={{ maxWidth: 720 }}>
        <Divider>全站与导航</Divider>
        <Form.Item name="site_name" label="站点名称（标题 / 顶栏字标）" rules={[{ required: true }]}>
          <Input placeholder="波波技术栈" />
        </Form.Item>
        <Form.Item name="site_tagline" label="站点副标（首页主视觉上方一行）">
          <Input placeholder="技术笔记 · 实践与方案" />
        </Form.Item>
        <Form.Item name="meta_description" label="站点 Meta 描述（SEO / 分享摘要）">
          <Input.TextArea rows={2} placeholder="个人技术博客：文章、方案与实践记录" />
        </Form.Item>
        <Form.Item name="logo_url" label="Logo 图片 URL（可选，留空则用默认 SVG；可填上传后的 /uploads/...）">
          <Input placeholder="/uploads/..." />
        </Form.Item>
        <Form.Item name="footer_line" label="页脚版权 / 说明一行">
          <Input placeholder="波波技术栈 · 个人技术博客 · Go + Next.js" />
        </Form.Item>

        <Divider>关于页</Divider>
        <Form.Item name="about_title" label="关于页标题（H1）" rules={[{ required: true }]}>
          <Input placeholder="关于" />
        </Form.Item>
        <Form.Item name="about_lead" label="关于页导语（标题下灰色段落）">
          <Input.TextArea rows={2} placeholder="一句话介绍站点或作者" />
        </Form.Item>
        <p style={{ marginBottom: 8, color: '#64748b', fontSize: 13 }}>关于页正文（Markdown，支持链接）</p>
        <MarkdownEditor
          initialValue={aboutMd}
          onChange={setAboutMd}
          instanceKey="site-about-body"
          height={360}
          uploadExtraData={{ category_name: '文章内容' }}
        />
        <Space style={{ marginTop: 16 }}>
          <Button type="primary" loading={saving} onClick={() => void submit()}>
            保存
          </Button>
        </Space>
      </Form>
    </Card>
  )
}

import { useEffect, useState } from 'react'
import { Button, Card, DatePicker, Divider, Form, Input, Modal, Select, Space, Table, message } from 'antd'
import { useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import api, { unwrap } from '../services/api'
import { MarkdownEditor } from '../components/editor/MarkdownEditor'

type Cat = { id: number; name: string; slug: string }
type Tag = { id: number; name: string; slug: string }

type Post = {
  id: number
  title: string
  slug: string
  excerpt: string
  cover_url: string
  status: string
  content_type: string
  body_format: string
  body_source: string
  body_html?: string
  published_at?: string
  categories?: Cat[]
  tags?: Tag[]
}

export default function PostEditPage() {
  const { id } = useParams()
  const isNew = id === 'new' || !id
  const nav = useNavigate()
  const [form] = Form.useForm()
  const [cats, setCats] = useState<Cat[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(!isNew)
  const [editorValue, setEditorValue] = useState<string | null>(isNew ? '' : null)
  const editorKey = isNew ? 'new' : String(id)

  type Media = { id: number; url: string; mime_type: string; size: number }
  const [mediaModalOpen, setMediaModalOpen] = useState(false)
  const [mediaLoading, setMediaLoading] = useState(false)
  const [mediaRows, setMediaRows] = useState<Media[]>([])
  const [mediaTotal, setMediaTotal] = useState(0)
  const [mediaPage, setMediaPage] = useState(1)
  const mediaPageSize = 12

  const loadMedia = async (p = 1) => {
    setMediaLoading(true)
    try {
      const res = await api.get('/api/v1/admin/media', { params: { page: p, page_size: mediaPageSize } })
      const data = unwrap<{ items: Media[]; total: number }>(res)
      setMediaRows(data.items)
      setMediaTotal(data.total)
      setMediaPage(p)
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '加载媒体失败')
    } finally {
      setMediaLoading(false)
    }
  }

  useEffect(() => {
    ;(async () => {
      try {
        const [c, t] = await Promise.all([
          api.get('/api/v1/admin/categories'),
          api.get('/api/v1/admin/tags'),
        ])
        setCats(unwrap<Cat[]>(c))
        setTags(unwrap<Tag[]>(t))
      } catch {
        message.error('加载分类/标签失败')
      }
    })()
  }, [])

  useEffect(() => {
    if (isNew) {
      form.setFieldsValue({
        status: 'draft',
        content_type: 'article',
        body_format: 'markdown',
      })
      setEditorValue('')
      return
    }
    ;(async () => {
      setLoading(true)
      try {
        const res = await api.get(`/api/v1/admin/posts/${id}`)
        const p = unwrap<Post>(res)
        form.setFieldsValue({
          ...p,
          category_ids: p.categories?.map((c) => c.id) ?? [],
          tag_ids: p.tags?.map((t) => t.id) ?? [],
          published_at: p.published_at ? dayjs(p.published_at) : undefined,
        })
        setEditorValue(p.body_source || p.body_html || '')
      } catch {
        message.error('加载文章失败')
        nav('/posts')
      } finally {
        setLoading(false)
      }
    })()
  }, [id, isNew, form, nav])

  const onSave = async () => {
    try {
      const v = await form.validateFields()
      if (!editorValue || editorValue.trim().length === 0) {
        message.error('请输入正文')
        return
      }
      const payload = {
        title: v.title,
        slug: v.slug || undefined,
        excerpt: v.excerpt || '',
        cover_url: v.cover_url || '',
        status: v.status,
        content_type: v.content_type,
        body_format: v.body_format || 'markdown',
        body_source: editorValue,
        published_at: v.published_at ? (v.published_at as dayjs.Dayjs).toISOString() : undefined,
        category_ids: v.category_ids || [],
        tag_ids: v.tag_ids || [],
      }
      if (isNew) {
        const res = await api.post('/api/v1/admin/posts', payload)
        const created = unwrap<Post>(res)
        message.success('已创建')
        nav(`/posts/${created.id}`, { replace: true })
      } else {
        await api.put(`/api/v1/admin/posts/${id}`, payload)
        message.success('已保存')
      }
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'errorFields' in e) return
      message.error(e instanceof Error ? e.message : '保存失败')
    }
  }

  return (
    <Card loading={loading} className="admin-card" title={isNew ? '新建文章' : '编辑文章'}>
      <Form form={form} layout="vertical">
        <Form.Item name="title" label="标题" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="slug" label="Slug（可选，留空则自动生成）">
          <Input placeholder="my-post-slug" />
        </Form.Item>
        <Form.Item name="excerpt" label="摘要">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="cover_url" label="封面图 URL">
          <Input
            placeholder="从媒体选择或手动输入 URL"
            addonAfter={
              <Button
                onClick={() => {
                  setMediaModalOpen(true)
                  void loadMedia(1)
                }}
              >
                从媒体选择
              </Button>
            }
          />
        </Form.Item>
        <Space wrap style={{ width: '100%' }}>
          <Form.Item name="status" label="状态" style={{ minWidth: 140 }}>
            <Select
              options={[
                { value: 'draft', label: '草稿' },
                { value: 'published', label: '已发布' },
              ]}
            />
          </Form.Item>
          <Form.Item name="content_type" label="内容类型" style={{ minWidth: 160 }}>
            <Select
              options={[
                { value: 'article', label: '文章' },
                { value: 'solution', label: '方案' },
                { value: 'intro', label: '介绍' },
                { value: 'demo', label: 'Demo' },
              ]}
            />
          </Form.Item>
          <Form.Item name="published_at" label="发布时间">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
        </Space>
        <Form.Item name="category_ids" label="分类">
          <Select
            mode="multiple"
            allowClear
            options={cats.map((c) => ({ value: c.id, label: `${c.name} (${c.slug})` }))}
          />
        </Form.Item>
        <Form.Item name="tag_ids" label="标签">
          <Select
            mode="multiple"
            allowClear
            options={tags.map((t) => ({ value: t.id, label: `${t.name} (${t.slug})` }))}
          />
        </Form.Item>
        <Divider style={{ marginTop: 4 }}>正文编辑</Divider>
        {editorValue === null ? null : (
          <MarkdownEditor
            initialValue={editorValue}
            onChange={setEditorValue}
            instanceKey={editorKey}
            height={400}
            uploadExtraData={{ category_name: '文章内容' }}
          />
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <Space>
            <Button type="primary" onClick={onSave}>
              保存
            </Button>
            <Button onClick={() => nav('/posts')}>返回列表</Button>
          </Space>
        </div>
      </Form>

      <Modal
        title="选择封面图"
        open={mediaModalOpen}
        onCancel={() => setMediaModalOpen(false)}
        footer={null}
        width={900}
        destroyOnClose
      >
        <Table
          rowKey="id"
          loading={mediaLoading}
          columns={[
            {
              title: '预览',
              dataIndex: 'url',
              key: 'url',
              width: 140,
              render: (url: string) => (
                <img
                  src={url}
                  alt="cover"
                  style={{ width: 120, height: 70, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }}
                />
              ),
            },
            { title: 'MIME', dataIndex: 'mime_type', key: 'mime_type', width: 180 },
            {
              title: '大小',
              dataIndex: 'size',
              key: 'size',
              width: 120,
              render: (s: number) => <span>{(s / 1024 / 1024).toFixed(2)} MB</span>,
            },
            {
              title: '操作',
              key: 'op',
              width: 160,
              render: (_, m: Media) => (
                <Button
                  type="primary"
                  size="small"
                  onClick={() => {
                    form.setFieldsValue({ cover_url: m.url })
                    setMediaModalOpen(false)
                  }}
                >
                  使用
                </Button>
              ),
            },
          ]}
          dataSource={mediaRows}
          pagination={{
            current: mediaPage,
            pageSize: mediaPageSize,
            total: mediaTotal,
            onChange: (p) => void loadMedia(p),
          }}
        />
      </Modal>
    </Card>
  )
}

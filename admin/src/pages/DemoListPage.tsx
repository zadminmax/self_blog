import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Switch, Table, Upload, message } from 'antd'
import { EditOutlined, PlusOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import api, { unwrap } from '../services/api'

type DemoCategory = { id: number; name: string; slug: string }
type MediaItem = { id: number; url: string; mime_type: string; size: number; created_at: string }
type Demo = {
  id: number
  name: string
  slug: string
  description: string
  cover_url: string
  enabled: boolean
  category?: DemoCategory | null
}

export default function DemoListPage() {
  const [loading, setLoading] = useState(false)
  const [demos, setDemos] = useState<Demo[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [categories, setCategories] = useState<DemoCategory[]>([])

  const [createOpen, setCreateOpen] = useState(false)
  const [form] = Form.useForm()
  const [editOpen, setEditOpen] = useState(false)
  const [editForm] = Form.useForm()
  const [editingDemo, setEditingDemo] = useState<Demo | null>(null)
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [mediaOpen, setMediaOpen] = useState(false)
  const [mediaTarget, setMediaTarget] = useState<'create' | 'edit'>('create')
  const [mediaLoading, setMediaLoading] = useState(false)
  const [mediaRows, setMediaRows] = useState<MediaItem[]>([])
  const [mediaTotal, setMediaTotal] = useState(0)
  const [mediaPage, setMediaPage] = useState(1)
  const mediaPageSize = 10

  const loadCategories = async () => {
    try {
      const res = await api.get('/api/v1/admin/demo-categories')
      setCategories(unwrap<DemoCategory[]>(res))
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '加载分类失败')
    }
  }

  const load = async (p = page) => {
    setLoading(true)
    try {
      const res = await api.get('/api/v1/admin/demos', { params: { page: p, page_size: pageSize } })
      const data = unwrap<{ items: Demo[]; total: number }>(res)
      setDemos(data.items)
      setTotal(data.total)
      setPage(p)
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '加载 demo 失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void (async () => {
      await loadCategories()
      await load(1)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setEnabled = async (d: Demo, enabled: boolean) => {
    try {
      await api.put(`/api/v1/admin/demos/${d.id}`, { enabled })
      message.success(enabled ? '已启用' : '已禁用')
      await load(page)
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '操作失败')
    }
  }

  const uploadProps: UploadProps = {
    accept: '.zip,application/zip',
    beforeUpload: (file) => {
      setZipFile(file as File)
      return false
    },
    onRemove: () => setZipFile(null),
    maxCount: 1,
  }

  const openCreate = () => {
    setCreateOpen(true)
    setZipFile(null)
    form.setFieldsValue({ enabled: true })
  }

  const openEdit = (d: Demo) => {
    setEditingDemo(d)
    setEditOpen(true)
    editForm.setFieldsValue({
      name: d.name,
      description: d.description,
      cover_url: d.cover_url || '',
      category_id: d.category?.id,
      enabled: d.enabled,
    })
  }

  const loadMedia = async (p = 1) => {
    setMediaLoading(true)
    try {
      const res = await api.get('/api/v1/admin/media', { params: { page: p, page_size: mediaPageSize } })
      const data = unwrap<{ items: MediaItem[]; total: number }>(res)
      setMediaRows(data.items)
      setMediaTotal(data.total)
      setMediaPage(p)
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '加载媒体失败')
    } finally {
      setMediaLoading(false)
    }
  }

  const onCreate = async () => {
    try {
      const v = await form.validateFields()
      if (!zipFile) {
        message.error('请先选择 demo zip 包')
        return
      }

      setUploading(true)
      const fd = new FormData()
      fd.append('file', zipFile)
      fd.append('name', v.name)
      if (v.slug) fd.append('slug', v.slug)
      fd.append('description', v.description || '')
      fd.append('cover_url', v.cover_url || '')
      if (v.category_id && v.category_id > 0) fd.append('category_id', String(v.category_id))
      fd.append('enabled', v.enabled ? '1' : '0')

      await api.post('/api/v1/admin/demos', fd)
      message.success('demo 已上传并部署')
      setCreateOpen(false)
      setZipFile(null)
      form.resetFields()
      await load(1)
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'errorFields' in e) return
      message.error(e instanceof Error ? e.message : '上传失败')
    } finally {
      setUploading(false)
    }
  }

  const onEditSave = async () => {
    if (!editingDemo) return
    try {
      const v = await editForm.validateFields()
      await api.put(`/api/v1/admin/demos/${editingDemo.id}`, {
        name: v.name,
        description: v.description || '',
        cover_url: v.cover_url || '',
        category_id: v.category_id || 0,
        enabled: !!v.enabled,
      })
      message.success('已更新 demo')
      setEditOpen(false)
      setEditingDemo(null)
      editForm.resetFields()
      await load(page)
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'errorFields' in e) return
      message.error(e instanceof Error ? e.message : '更新失败')
    }
  }

  const columns: ColumnsType<Demo> = useMemo(
    () => [
      { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true },
      { title: 'Slug', dataIndex: 'slug', key: 'slug', width: 180 },
      {
        title: '运行路径',
        key: 'run_url',
        width: 220,
        render: (_, d) => <Input value={`/demos/${d.slug}`} readOnly size="small" />,
      },
      {
        title: '分类',
        dataIndex: 'category',
        key: 'category',
        render: (c: DemoCategory | null | undefined) => <span>{c?.name || '-'}</span>,
      },
      {
        title: '封面',
        dataIndex: 'cover_url',
        key: 'cover_url',
        width: 260,
        render: (url: string) =>
          url ? (
            <Space direction="vertical" size={4}>
              <img src={url} alt="cover" style={{ width: 64, height: 40, objectFit: 'cover', borderRadius: 6 }} />
              <Input value={url} readOnly size="small" />
            </Space>
          ) : (
            '-'
          ),
      },
      {
        title: '启用',
        dataIndex: 'enabled',
        key: 'enabled',
        width: 120,
        render: (enabled: boolean, d: Demo) => (
          <Switch checked={enabled} onChange={(v) => void setEnabled(d, v)} />
        ),
      },
      {
        title: '操作',
        key: 'op',
        width: 220,
        render: (_, d) => (
          <Space>
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(d)}>
              编辑
            </Button>
            <Popconfirm
              title={`确定删除 Demo「${d.name}」？`}
              description="将同时清理数据库记录和解压后的静态文件目录。"
              okText="删除"
              cancelText="取消"
              onConfirm={async () => {
                try {
                  await api.delete(`/api/v1/admin/demos/${d.id}`)
                  message.success('已删除并清理')
                  await load(page)
                } catch (e: unknown) {
                  message.error(e instanceof Error ? e.message : '删除失败')
                }
              }}
            >
              <Button size="small" danger>
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [page]
  )

  return (
    <Card className="admin-card">
      <div className="admin-toolbar">
        <div>
          <h2 className="admin-page-title">Demo 管理</h2>
          <p className="admin-page-subtitle">上传 ZIP 原型包，部署后前端可独立访问</p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => load(page)}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            上传 Demo
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={demos}
        pagination={{ current: page, pageSize, total, onChange: (p) => load(p) }}
      />

      <Modal
        title="上传 Demo（ZIP）"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => void onCreate()}
        okText="上传并部署"
        destroyOnClose
        confirmLoading={uploading}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Demo 名称" rules={[{ required: true }]}>
            <Input placeholder="例如：教育/AI/商场" />
          </Form.Item>
          <Form.Item name="slug" label="Slug（可选，留空自动生成）">
            <Input placeholder="my-demo" />
          </Form.Item>
          <Form.Item name="category_id" label="分类">
            <Select allowClear options={categories.map((c) => ({ value: c.id, label: c.name }))} placeholder="选择分类" />
          </Form.Item>
          <Form.Item name="description" label="简单介绍">
            <Input.TextArea rows={3} placeholder="一句话介绍" />
          </Form.Item>
          <Form.Item name="cover_url" label="封面图 URL（可选）">
            <Input
              placeholder="可手动输入，或从媒体库选择"
              addonAfter={
                <Button
                  onClick={() => {
                    setMediaTarget('create')
                    setMediaOpen(true)
                    void loadMedia(1)
                  }}
                >
                  从媒体库选
                </Button>
              }
            />
          </Form.Item>
          <Form.Item name="enabled" label="是否启用" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="Demo ZIP 包（必填）" required>
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />}>选择 ZIP</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingDemo ? `编辑 Demo：${editingDemo.name}` : '编辑 Demo'}
        open={editOpen}
        onCancel={() => {
          setEditOpen(false)
          setEditingDemo(null)
          editForm.resetFields()
        }}
        onOk={() => void onEditSave()}
        okText="保存"
        destroyOnClose
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="name" label="Demo 名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="category_id" label="分类">
            <Select allowClear options={categories.map((c) => ({ value: c.id, label: c.name }))} placeholder="选择分类" />
          </Form.Item>
          <Form.Item name="description" label="简单介绍">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="cover_url" label="封面图 URL">
            <Input
              addonAfter={
                <Button
                  onClick={() => {
                    setMediaTarget('edit')
                    setMediaOpen(true)
                    void loadMedia(1)
                  }}
                >
                  从媒体库选
                </Button>
              }
            />
          </Form.Item>
          <Form.Item name="enabled" label="是否启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="选择封面图（媒体库）"
        open={mediaOpen}
        onCancel={() => setMediaOpen(false)}
        footer={null}
        width={860}
        destroyOnClose
      >
        <Table
          rowKey="id"
          loading={mediaLoading}
          dataSource={mediaRows}
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
            { title: 'MIME', dataIndex: 'mime_type', key: 'mime_type', width: 160 },
            {
              title: '上传时间',
              dataIndex: 'created_at',
              key: 'created_at',
              width: 180,
              render: (v: string) => {
                const d = new Date(v)
                return isNaN(d.getTime()) ? v : d.toLocaleString()
              },
            },
            {
              title: '操作',
              key: 'op',
              width: 120,
              render: (_, m: MediaItem) => (
                <Button
                  type="primary"
                  size="small"
                  onClick={() => {
                    if (mediaTarget === 'create') {
                      form.setFieldsValue({ cover_url: m.url })
                    } else {
                      editForm.setFieldsValue({ cover_url: m.url })
                    }
                    setMediaOpen(false)
                  }}
                >
                  使用
                </Button>
              ),
            },
          ]}
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


import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Upload, message } from 'antd'
import { DeleteOutlined, ReloadOutlined, CopyOutlined, UploadOutlined, EditOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import api, { unwrap } from '../services/api'

type Category = { id: number; name: string; slug: string }

type Media = {
  id: number
  url: string
  mime_type: string
  size: number
  uploader_id: number
  created_at: string
  name?: string
  category_id?: number | null
  category_name?: string | null
}

function formatBytes(bytes: number) {
  const units = ['B', 'KB', 'MB', 'GB']
  let n = bytes
  let i = 0
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export default function MediaListPage() {
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<Media[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  const pageSize = 20

  const [categories, setCategories] = useState<Category[]>([])
  const [searchName, setSearchName] = useState('')
  const [filterCategoryId, setFilterCategoryId] = useState<number | null>(null)

  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadName, setUploadName] = useState('')
  const [uploadCategoryId, setUploadCategoryId] = useState<number | null>(null)
  const [uploadLoading, setUploadLoading] = useState(false)

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingMedia, setEditingMedia] = useState<Media | null>(null)
  const [editForm] = Form.useForm()

  const load = async (p = page) => {
    setLoading(true)
    try {
      const params: Record<string, any> = { page: p, page_size: pageSize }
      const q = searchName.trim()
      if (q) params.q = q
      if (filterCategoryId && filterCategoryId > 0) params.category_id = filterCategoryId

      const res = await api.get('/api/v1/admin/media', { params })
      const data = unwrap<{ items: Media[]; total: number }>(res)
      setRows(data.items)
      setTotal(data.total)
      setPage(p)
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(1)
    void (async () => {
      try {
        const res = await api.get('/api/v1/admin/media-categories')
        setCategories(unwrap<Category[]>(res))
      } catch (e: unknown) {
        message.error(e instanceof Error ? e.message : '加载分类失败')
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const del = async (id: number) => {
    try {
      await api.delete(`/api/v1/admin/media/${id}`)
      message.success('已删除')
      load(page)
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '删除失败')
    }
  }

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      message.success('已复制')
    } catch {
      const ta = document.createElement('textarea')
      ta.value = url
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      message.success('已复制')
    }
  }

  const openEdit = (m: Media) => {
    setEditingMedia(m)
    editForm.setFieldsValue({
      name: m.name || '',
      category_id: m.category_id || 0,
    })
    setEditModalOpen(true)
  }

  const saveEdit = async () => {
    if (!editingMedia) return
    try {
      const v = await editForm.validateFields()
      const categoryId = typeof v.category_id === 'number' ? v.category_id : 0
      await api.put(`/api/v1/admin/media/${editingMedia.id}`, {
        name: v.name || '',
        category_id: categoryId || 0,
      })
      message.success('已更新')
      setEditModalOpen(false)
      setEditingMedia(null)
      editForm.resetFields()
      load(page)
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '更新失败')
    }
  }

  const columns: ColumnsType<Media> = useMemo(
    () => [
      {
        title: '预览',
        dataIndex: 'url',
        key: 'url',
        width: 120,
        render: (url: string) => (
          <img
            src={url}
            alt="preview"
            style={{ width: 80, height: 48, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }}
          />
        ),
      },
      {
        title: '名称',
        dataIndex: 'name',
        key: 'name',
        width: 220,
        render: (v: string | undefined) => <span>{v || '-'}</span>,
      },
      {
        title: '分类',
        dataIndex: 'category_name',
        key: 'category_name',
        width: 160,
        render: (v: string | null | undefined) => <span>{v || '-'}</span>,
      },
      { title: 'MIME', dataIndex: 'mime_type', key: 'mime_type', width: 160 },
      {
        title: '大小',
        dataIndex: 'size',
        key: 'size',
        width: 120,
        render: (s: number) => <span>{formatBytes(s)}</span>,
      },
      { title: '上传者', dataIndex: 'uploader_id', key: 'uploader_id', width: 100, render: (id) => <span>#{id}</span> },
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
        width: 260,
        render: (_, m) => (
          <Space>
            <Button size="small" icon={<CopyOutlined />} onClick={() => copyUrl(m.url)}>
              复制
            </Button>
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(m)}>
              备注/分类
            </Button>
            <Popconfirm title="确定删除这张图片？" onConfirm={() => del(m.id)} okText="删除" cancelText="取消">
              <Button danger size="small" icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, searchName, filterCategoryId]
  )

  return (
    <Card className="admin-card">
      <div className="admin-toolbar">
        <div>
          <h2 className="admin-page-title">媒体管理</h2>
          <p className="admin-page-subtitle">上传/分类/备注/复制链接与管理</p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => load(page)}>
            刷新
          </Button>
        </Space>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
        <Input
          style={{ width: 240 }}
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          placeholder="按名称搜索（备注）"
          allowClear
        />
        <Select
          style={{ width: 220 }}
          value={filterCategoryId ?? undefined}
          onChange={(v) => setFilterCategoryId(v ?? null)}
          allowClear
          placeholder="按分类筛选"
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
        />
        <Button type="primary" onClick={() => load(1)}>
          搜索
        </Button>
      </div>

      <Card size="small" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Upload
            beforeUpload={(file) => {
              setUploadFile(file as File)
              return false
            }}
            onRemove={() => setUploadFile(null)}
            showUploadList={uploadFile ? { showRemoveIcon: true } : false}
            maxCount={1}
          >
            <Button icon={<UploadOutlined />}>选择图片</Button>
          </Upload>
          <Input style={{ width: 260 }} value={uploadName} onChange={(e) => setUploadName(e.target.value)} placeholder="备注名称（可选）" />
          <Select
            style={{ width: 220 }}
            value={uploadCategoryId ?? undefined}
            onChange={(v) => setUploadCategoryId(v ?? null)}
            allowClear
            placeholder="选择分类（可选）"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <Button
            type="primary"
            loading={uploadLoading}
            onClick={async () => {
              if (!uploadFile) {
                message.error('请先选择图片')
                return
              }
              try {
                setUploadLoading(true)
                const fd = new FormData()
                fd.append('file', uploadFile)
                if (uploadName.trim()) fd.append('name', uploadName.trim())
                if (uploadCategoryId && uploadCategoryId > 0) fd.append('category_id', String(uploadCategoryId))
                await api.post('/api/v1/admin/media', fd)
                message.success('上传成功')
                setUploadFile(null)
                setUploadName('')
                setUploadCategoryId(null)
                await load(page)
              } catch (e: unknown) {
                message.error(e instanceof Error ? e.message : '上传失败')
              } finally {
                setUploadLoading(false)
              }
            }}
          >
            上传到媒体库
          </Button>
        </div>
      </Card>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: (p) => load(p),
        }}
      />

      <Modal
        title={editingMedia ? `编辑媒体 #${editingMedia.id}` : '编辑媒体'}
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false)
          setEditingMedia(null)
          editForm.resetFields()
        }}
        onOk={saveEdit}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="name" label="备注名称">
            <Input placeholder="例如：文章封面/头像/配图" />
          </Form.Item>
          <Form.Item name="category_id" label="分类">
            <Select
              allowClear
              options={[{ value: 0, label: '未分类' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
              placeholder="选择分类"
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}


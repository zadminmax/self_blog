import { useEffect, useState } from 'react'
import { Button, Input, Space, Table, Tag, message, Card, Typography, Popconfirm } from 'antd'
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Link, useNavigate } from 'react-router-dom'
import api, { unwrap } from '../services/api'
import type { ColumnsType } from 'antd/es/table'

type Row = {
  id: number
  title: string
  slug: string
  status: string
  content_type: string
  published_at?: string
}

export default function PostListPage() {
  const nav = useNavigate()
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [filteredRows, setFilteredRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const pageSize = 15

  const load = async (p = page) => {
    setLoading(true)
    try {
      const res = await api.get('/api/v1/admin/posts', { params: { page: p, page_size: pageSize } })
      const data = unwrap<{ items: Row[]; total: number }>(res)
      setRows(data.items)
      setFilteredRows(data.items)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const del = async (id: number) => {
    try {
      await api.delete(`/api/v1/admin/posts/${id}`)
      message.success('已删除')
      load(page)
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '删除失败')
    }
  }

  const onSearch = (v: string) => {
    setKeyword(v)
    const kw = v.trim().toLowerCase()
    if (!kw) {
      setFilteredRows(rows)
      return
    }
    setFilteredRows(
      rows.filter((r) => r.title.toLowerCase().includes(kw) || r.slug.toLowerCase().includes(kw))
    )
  }

  const columns: ColumnsType<Row> = [
    { title: '标题', dataIndex: 'title', ellipsis: true },
    { title: 'Slug', dataIndex: 'slug', width: 180, ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s: string) => <Tag color={s === 'published' ? 'green' : 'default'}>{s}</Tag>,
    },
    { title: '类型', dataIndex: 'content_type', width: 100 },
    {
      title: '操作',
      key: 'op',
      width: 160,
      render: (_, r) => (
        <Space>
          <Link to={`/posts/${r.id}`}>编辑</Link>
          <Popconfirm title="确定删除这篇文章？" onConfirm={() => del(r.id)} okText="删除" cancelText="取消">
            <Button type="link" danger size="small">
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Card className="admin-card">
      <div className="admin-toolbar">
        <div>
          <h2 className="admin-page-title">文章管理</h2>
          <p className="admin-page-subtitle">管理技术文章、方案流程与 Demo 内容</p>
        </div>
        <Space>
          <Input
            allowClear
            value={keyword}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="搜索标题或 slug"
            prefix={<SearchOutlined />}
            style={{ width: 240 }}
          />
          <Button icon={<ReloadOutlined />} onClick={() => load(page)}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => nav('/posts/new')}>
            新建文章
          </Button>
        </Space>
      </div>
      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
        当前页 {filteredRows.length} 条，系统总计 {total} 条
      </Typography.Paragraph>
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={filteredRows}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: (p) => load(p),
        }}
      />
    </Card>
  )
}

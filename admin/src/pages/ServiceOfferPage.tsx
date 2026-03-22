import { useEffect, useState } from 'react'
import { Button, Card, Divider, Form, Input, Modal, Popconfirm, Select, Space, Switch, Table, message } from 'antd'
import api, { unwrap } from '../services/api'
import { MarkdownEditor } from '../components/editor/MarkdownEditor'

type Row = {
  id: number
  name: string
  slug: string
  category: string
  price_text: string
  summary: string
  content: string
  cover_url: string
  sort_order: number
  featured: boolean
  enabled: boolean
}

const categoryOptions = ['教育', 'AI', '商场', '企业官网', '小程序', '系统开发', '运维支持'].map((x) => ({ value: x, label: x }))

export default function ServiceOfferPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [editorValue, setEditorValue] = useState('')
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/v1/admin/services')
      setRows(unwrap<Row[]>(res))
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
      const payload = {
        ...v,
        content: editorValue,
        sort_order: v.sort_order ?? 100,
        featured: !!v.featured,
        enabled: !!v.enabled,
      }
      if (editing) {
        await api.put(`/api/v1/admin/services/${editing.id}`, payload)
        message.success('已更新')
      } else {
        await api.post('/api/v1/admin/services', payload)
        message.success('已创建')
      }
      setOpen(false)
      setEditing(null)
      setEditorValue('')
      form.resetFields()
      await load()
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'errorFields' in e) return
      message.error(e instanceof Error ? e.message : '保存失败')
    }
  }

  const remove = async (id: number) => {
    try {
      await api.delete(`/api/v1/admin/services/${id}`)
      message.success('已删除')
      await load()
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '删除失败')
    }
  }

  return (
    <Card className="admin-card">
      <div className="admin-toolbar">
        <div>
          <h2 className="admin-page-title">技术服务管理</h2>
          <p className="admin-page-subtitle">
            维护服务名称、报价、封面与详情。前台首页「服务内容」按排序展示前 6 条已启用项（2×3 网格），完整列表见服务页。
          </p>
        </div>
        <Button
          type="primary"
          onClick={() => {
            setEditing(null)
            setEditorValue('')
            form.resetFields()
            form.setFieldsValue({ sort_order: 100, enabled: true, featured: false })
            setOpen(true)
          }}
        >
          新建服务
        </Button>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={rows}
        pagination={false}
        columns={[
          { title: '名称', dataIndex: 'name', width: 180 },
          { title: '分类', dataIndex: 'category', width: 100 },
          { title: '报价', dataIndex: 'price_text', width: 120 },
          { title: '排序', dataIndex: 'sort_order', width: 80 },
          { title: '推荐', dataIndex: 'featured', width: 80, render: (v: boolean) => (v ? '是' : '否') },
          { title: '启用', dataIndex: 'enabled', width: 80, render: (v: boolean) => (v ? '是' : '否') },
          {
            title: '操作',
            width: 180,
            render: (_, r) => (
              <Space>
                <Button
                  type="link"
                  onClick={() => {
                    setEditing(r)
                    form.setFieldsValue(r)
                    setEditorValue(r.content || '')
                    setOpen(true)
                  }}
                >
                  编辑
                </Button>
                <Popconfirm title="确定删除该服务？" onConfirm={() => remove(r.id)} okText="删除" cancelText="取消">
                  <Button type="link" danger>
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? '编辑服务' : '新建服务'}
        open={open}
        onOk={() => void submit()}
        onCancel={() => {
          setOpen(false)
          setEditing(null)
          setEditorValue('')
        }}
        width={760}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="服务名称" rules={[{ required: true }]}>
            <Input placeholder="例如：AI 智能客服系统开发" />
          </Form.Item>
          <Form.Item name="slug" label="Slug（可选）">
            <Input placeholder="ai-customer-service" />
          </Form.Item>
          <Space style={{ width: '100%' }} align="start">
            <Form.Item name="category" label="分类" style={{ minWidth: 180 }}>
              <Select allowClear options={categoryOptions} />
            </Form.Item>
            <Form.Item name="price_text" label="报价" style={{ minWidth: 180 }}>
              <Input placeholder="￥6,000 起 / 项目" />
            </Form.Item>
            <Form.Item name="sort_order" label="排序" style={{ minWidth: 120 }}>
              <Input type="number" />
            </Form.Item>
          </Space>
          <Form.Item name="summary" label="简述">
            <Input.TextArea rows={2} placeholder="一句话描述服务价值" />
          </Form.Item>
          <Divider style={{ marginTop: 4 }}>服务内容（Markdown）</Divider>
          <MarkdownEditor
            initialValue={editorValue}
            onChange={setEditorValue}
            instanceKey={editing ? `service-${editing.id}` : 'service-new'}
            height={320}
            uploadExtraData={{ category_name: '文章内容' }}
          />
          <Form.Item name="cover_url" label="封面图 URL（可选）">
            <Input />
          </Form.Item>
          <Space>
            <Form.Item name="featured" label="推荐" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="enabled" label="启用" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </Card>
  )
}


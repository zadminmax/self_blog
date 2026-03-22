import { useEffect, useState } from 'react'
import { Button, Card, Form, Input, Modal, Popconfirm, Space, Table, message } from 'antd'
import api, { unwrap } from '../services/api'

type Row = { id: number; name: string; slug: string }

export default function DemoCategoryPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/v1/admin/demo-categories')
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
    const v = await form.validateFields()
    try {
      if (editing) {
        await api.put(`/api/v1/admin/demo-categories/${editing.id}`, v)
        message.success('已更新')
      } else {
        await api.post('/api/v1/admin/demo-categories', v)
        message.success('已创建')
      }
      setOpen(false)
      setEditing(null)
      form.resetFields()
      await load()
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '保存失败')
    }
  }

  const remove = async (id: number) => {
    try {
      await api.delete(`/api/v1/admin/demo-categories/${id}`)
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
          <h2 className="admin-page-title">Demo 分类管理</h2>
          <p className="admin-page-subtitle">维护 Demo 功能分类（教育/AI/商场 等）</p>
        </div>
        <Button
          type="primary"
          onClick={() => {
            setEditing(null)
            form.resetFields()
            setOpen(true)
          }}
        >
          新建分类
        </Button>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={rows}
        pagination={false}
        columns={[
          { title: '名称', dataIndex: 'name' },
          { title: 'Slug', dataIndex: 'slug' },
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
                    setOpen(true)
                  }}
                >
                  编辑
                </Button>
                <Popconfirm title="确定删除该分类？" onConfirm={() => remove(r.id)} okText="删除" cancelText="取消">
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
        title={editing ? '编辑 Demo 分类' : '新建 Demo 分类'}
        open={open}
        onOk={() => void submit()}
        onCancel={() => {
          setOpen(false)
          setEditing(null)
        }}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="slug" label="Slug" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}


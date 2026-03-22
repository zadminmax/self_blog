import { useEffect, useState } from 'react'
import { Button, Card, Form, Input, Modal, Space, Table, message } from 'antd'
import api, { unwrap } from '../services/api'

type Row = { id: number; name: string; slug: string }

export default function TagListPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/v1/admin/tags')
      setRows(unwrap<Row[]>(res))
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const submit = async () => {
    const v = await form.validateFields()
    try {
      if (editing) {
        await api.put(`/api/v1/admin/tags/${editing.id}`, v)
        message.success('已更新')
      } else {
        await api.post('/api/v1/admin/tags', v)
        message.success('已创建')
      }
      setOpen(false)
      setEditing(null)
      form.resetFields()
      load()
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '保存失败')
    }
  }

  return (
    <Card className="admin-card">
      <div className="admin-toolbar">
        <div>
          <h2 className="admin-page-title">标签管理</h2>
          <p className="admin-page-subtitle">为文章增加检索维度</p>
        </div>
      </div>
      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          onClick={() => {
            setEditing(null)
            form.resetFields()
            setOpen(true)
          }}
        >
          新建标签
        </Button>
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={rows}
        columns={[
          { title: '名称', dataIndex: 'name' },
          { title: 'Slug', dataIndex: 'slug' },
          {
            title: '操作',
            render: (_, r) => (
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
            ),
          },
        ]}
      />
      <Modal
        title={editing ? '编辑标签' : '新建标签'}
        open={open}
        onOk={submit}
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

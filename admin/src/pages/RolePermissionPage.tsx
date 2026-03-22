import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Form, Input, Modal, Select, Space, Table, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import api, { unwrap } from '../services/api'

type Role = { id: number; name: string; description?: string }
type Permission = { id: number; name: string }

type RoleDetail = {
  id: number
  name: string
  description: string
  permissions?: Permission[]
}

export default function RolePermissionPage() {
  const [loading, setLoading] = useState(false)
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])

  const [detailOpen, setDetailOpen] = useState(false)
  const [activeRole, setActiveRole] = useState<Role | null>(null)
  const [detailForm] = Form.useForm()

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm] = Form.useForm()

  const permOptions = useMemo(
    () => permissions.map((p) => ({ value: p.id, label: p.name })),
    [permissions]
  )

  const load = async () => {
    setLoading(true)
    try {
      const [r, p] = await Promise.all([api.get('/api/v1/admin/roles'), api.get('/api/v1/admin/permissions')])
      setRoles(unwrap<Role[]>(r))
      setPermissions(unwrap<Permission[]>(p))
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openPermissions = async (role: Role) => {
    setActiveRole(role)
    setDetailOpen(true)
    try {
      const res = await api.get(`/api/v1/admin/roles/${role.id}`)
      const detail = unwrap<RoleDetail>(res)
      const ids = (detail.permissions || []).map((x) => x.id)
      detailForm.setFieldsValue({ permission_ids: ids })
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '加载角色权限失败')
    }
  }

  const onSubmitPermissions = async () => {
    try {
      const v = await detailForm.validateFields()
      if (!activeRole) return
      await api.put(`/api/v1/admin/roles/${activeRole.id}/permissions`, { permission_ids: v.permission_ids || [] })
      message.success('权限已保存')
      setDetailOpen(false)
      setActiveRole(null)
      detailForm.resetFields()
      load()
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'errorFields' in e) return
      message.error(e instanceof Error ? e.message : '保存失败')
    }
  }

  const onSubmitCreateRole = async () => {
    try {
      const v = await createForm.validateFields()
      await api.post('/api/v1/admin/roles', { name: v.name, description: v.description || '' })
      message.success('角色已创建')
      setCreateOpen(false)
      createForm.resetFields()
      load()
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'errorFields' in e) return
      message.error(e instanceof Error ? e.message : '创建失败')
    }
  }

  const columns: ColumnsType<Role> = [
    { title: '角色名', dataIndex: 'name', key: 'name' },
    { title: '描述', dataIndex: 'description', key: 'description' },
    {
      title: '操作',
      key: 'op',
      width: 260,
      render: (_, r) => (
        <Space>
          <Button size="small" onClick={() => openPermissions(r)}>
            权限设置
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <Card className="admin-card">
      <div className="admin-toolbar">
        <div>
          <h2 className="admin-page-title">角色与权限</h2>
          <p className="admin-page-subtitle">给角色分配权限点，并管理管理员赋权</p>
        </div>
        <Space>
          <Button type="primary" onClick={() => setCreateOpen(true)}>
            新建角色
          </Button>
        </Space>
      </div>

      <Table rowKey="id" loading={loading} columns={columns} dataSource={roles} pagination={false} />

      <Modal
        title={activeRole ? `给角色 ${activeRole.name} 设置权限` : '权限设置'}
        open={detailOpen}
        destroyOnClose
        onCancel={() => {
          setDetailOpen(false)
          setActiveRole(null)
          detailForm.resetFields()
        }}
        onOk={onSubmitPermissions}
        okText="保存"
      >
        <Form form={detailForm} layout="vertical">
          <Form.Item name="permission_ids" label="权限点（可多选）" rules={[{ required: true }]}>
            <Select mode="multiple" allowClear options={permOptions} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="新建角色"
        open={createOpen}
        destroyOnClose
        onCancel={() => setCreateOpen(false)}
        onOk={onSubmitCreateRole}
        okText="创建"
      >
        <Form form={createForm} layout="vertical">
          <Form.Item name="name" label="角色名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}


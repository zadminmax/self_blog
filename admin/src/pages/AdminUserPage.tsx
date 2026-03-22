import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import api, { unwrap } from '../services/api'

type Role = { id: number; name: string; description?: string }
type UserRole = { id: number; name: string }
type User = { id: number; username: string; active: boolean; roles: UserRole[] }

export default function AdminUserPage() {
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])

  const [roleModalOpen, setRoleModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [roleForm] = Form.useForm()

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm] = Form.useForm()

  const roleOptions = useMemo(() => roles.map((r) => ({ value: r.id, label: r.name })), [roles])

  const load = async () => {
    setLoading(true)
    try {
      const [u, r] = await Promise.all([api.get('/api/v1/admin/users'), api.get('/api/v1/admin/roles')])
      setUsers(unwrap<User[]>(u))
      setRoles(unwrap<Role[]>(r))
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openAssign = (u: User) => {
    setEditingUser(u)
    const roleIDs = u.roles.map((x) => x.id)
    roleForm.setFieldsValue({ role_ids: roleIDs })
    setRoleModalOpen(true)
  }

  const onSubmitAssign = async () => {
    try {
      const v = await roleForm.validateFields()
      if (!editingUser) return
      await api.put(`/api/v1/admin/users/${editingUser.id}/roles`, { role_ids: v.role_ids || [] })
      message.success('赋权成功')
      setRoleModalOpen(false)
      setEditingUser(null)
      roleForm.resetFields()
      load()
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'errorFields' in e) return
      message.error(e instanceof Error ? e.message : '赋权失败')
    }
  }

  const onSubmitCreate = async () => {
    try {
      const v = await createForm.validateFields()
      const res = await api.post('/api/v1/admin/users', {
        username: v.username,
        password: v.password,
        role_ids: v.role_ids || [],
      })
      void res
      message.success('用户已创建')
      setCreateOpen(false)
      createForm.resetFields()
      load()
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'errorFields' in e) return
      message.error(e instanceof Error ? e.message : '创建失败')
    }
  }

  const setActive = async (u: User, active: boolean) => {
    try {
      await api.put(`/api/v1/admin/users/${u.id}/active`, { active })
      message.success(active ? '已启用' : '已禁用')
      load()
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '操作失败')
    }
  }

  const columns: ColumnsType<User> = [
    { title: '用户名', dataIndex: 'username', key: 'username' },
    {
      title: '状态',
      dataIndex: 'active',
      key: 'active',
      render: (a: boolean) => (a ? '启用' : '禁用'),
    },
    {
      title: '角色',
      dataIndex: 'roles',
      key: 'roles',
      render: (rs: UserRole[]) => rs.map((r) => r.name).join('、') || '-',
    },
    {
      title: '操作',
      key: 'op',
      width: 220,
      render: (_, u) => (
        <Space>
          <Button size="small" onClick={() => openAssign(u)}>
            赋权
          </Button>
          <Popconfirm
            title={u.active ? '确定禁用该管理员？' : '确定启用该管理员？'}
            okText="确定"
            cancelText="取消"
            onConfirm={() => setActive(u, !u.active)}
          >
            <Button size="small" danger={u.active} type={u.active ? 'default' : 'primary'}>
              {u.active ? '禁用' : '启用'}
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
          <h2 className="admin-page-title">管理员管理</h2>
          <p className="admin-page-subtitle">为用户配置角色与权限</p>
        </div>
        <Space>
          <Button type="primary" onClick={() => setCreateOpen(true)}>
            新建管理员
          </Button>
        </Space>
      </div>

      <Table rowKey="id" loading={loading} columns={columns} dataSource={users} pagination={false} />

      <Modal
        title="新建管理员"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={onSubmitCreate}
        okText="创建"
        destroyOnClose
      >
        <Form form={createForm} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="role_ids" label="角色（可多选）">
            <Select mode="multiple" allowClear options={roleOptions} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingUser ? `给 ${editingUser.username} 赋权` : '赋权'}
        open={roleModalOpen}
        onCancel={() => {
          setRoleModalOpen(false)
          setEditingUser(null)
          roleForm.resetFields()
        }}
        onOk={onSubmitAssign}
        okText="保存"
        destroyOnClose
      >
        <Form form={roleForm} layout="vertical">
          <Form.Item name="role_ids" label="角色（可多选）" rules={[{ required: true }]}>
            <Select mode="multiple" allowClear options={roleOptions} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}


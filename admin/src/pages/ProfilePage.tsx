import { useEffect, useMemo, useState } from 'react'
import { Avatar, Button, Card, Input, message, Space, Upload } from 'antd'
import { UploadOutlined, SaveOutlined, LockOutlined } from '@ant-design/icons'
import api, { unwrap } from '../services/api'

type Profile = {
  id: number
  username: string
  nickname: string
  avatar_url: string
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)

  const [nickname, setNickname] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const [avatarFile, setAvatarFile] = useState<any>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/v1/admin/me/profile')
      const data = unwrap<Profile>(res)
      setProfile(data)
      setNickname(data.nickname || '')
      setAvatarPreview(data.avatar_url || '')
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const avatarProps = useMemo(
    () => ({
      accept: 'image/*',
      listType: 'picture-card' as const,
      beforeUpload: (file: any) => {
        setAvatarFile(file)
        const url = URL.createObjectURL(file)
        setAvatarPreview(url)
        return false
      },
      onRemove: () => {
        setAvatarFile(null)
        setAvatarPreview(profile?.avatar_url || '')
      },
    }),
    [avatarPreview, profile?.avatar_url]
  )

  const onSaveNickname = async () => {
    try {
      await api.put('/api/v1/admin/me/profile', { nickname })
      message.success('昵称已更新')
      await load()
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '更新失败')
    }
  }

  const onSavePassword = async () => {
    if (!currentPassword || !newPassword) {
      message.error('请填写当前密码和新密码')
      return
    }
    try {
      await api.put('/api/v1/admin/me/password', { current_password: currentPassword, new_password: newPassword })
      message.success('密码已更新')
      setCurrentPassword('')
      setNewPassword('')
      await load()
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '更新失败')
    }
  }

  const onSaveAvatar = async () => {
    if (!avatarFile) {
      message.error('请先选择头像图片')
      return
    }

    try {
      const fd = new FormData()
      fd.append('file', avatarFile)
      await api.post('/api/v1/admin/me/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      message.success('头像已更新')
      setAvatarFile(null)
      await load()
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '上传失败')
    }
  }

  return (
    <Card className="admin-card">
      <div className="admin-toolbar">
        <div>
          <h2 className="admin-page-title">个人设置</h2>
          <p className="admin-page-subtitle">修改昵称、密码与头像（头像会自动压缩大尺寸图片）</p>
        </div>
        <Space />
      </div>

      <Space direction="vertical" style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar
            size={64}
            src={avatarPreview || undefined}
            icon={!avatarPreview ? <LockOutlined /> : undefined}
            style={{ border: '1px solid #e2e8f0' }}
          />
          <div style={{ flex: 1 }}>
            <Upload {...avatarProps}>
              <Button icon={<UploadOutlined />}>选择头像</Button>
            </Upload>
          </div>
          <Button type="primary" icon={<SaveOutlined />} onClick={onSaveAvatar} disabled={loading}>
            保存头像
          </Button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 140, color: '#64748b' }}>昵称</div>
          <Input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="输入昵称" />
          <Button type="primary" icon={<SaveOutlined />} onClick={onSaveNickname} disabled={loading} style={{ minWidth: 120 }}>
            保存昵称
          </Button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ width: 140, color: '#64748b' }}>密码</div>
          <Space direction="vertical" style={{ minWidth: 260 }}>
            <Input.Password
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="当前密码"
              disabled={loading}
            />
            <Input.Password
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="新密码"
              disabled={loading}
            />
          </Space>
          <Button type="primary" icon={<SaveOutlined />} onClick={onSavePassword} disabled={loading} style={{ minWidth: 140 }}>
            保存密码
          </Button>
        </div>
      </Space>
    </Card>
  )
}


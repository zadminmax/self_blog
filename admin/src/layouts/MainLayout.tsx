import { Layout, Menu, Typography, Dropdown, Avatar, Breadcrumb, Space } from 'antd'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  FileTextOutlined,
  TagsOutlined,
  FolderOutlined,
  LogoutOutlined,
  UserOutlined,
  HomeOutlined,
  UserSwitchOutlined,
  SafetyCertificateOutlined,
  PictureOutlined,
  GlobalOutlined,
} from '@ant-design/icons'
import { useAuth } from '../auth'
import { AdminLogoMark } from '../components/AdminLogoMark'

const { Header, Sider, Content } = Layout

export default function MainLayout() {
  const nav = useNavigate()
  const loc = useLocation()
  const { user, logout } = useAuth()
  const [brandName, setBrandName] = useState('波波技术栈')

  useEffect(() => {
    const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
    void fetch(`${base}/api/v1/public/site-settings`)
      .then((r) => r.json() as Promise<{ code: number; data?: { site_name?: string } }>)
      .then((j) => {
        if (j.code === 0 && j.data?.site_name) setBrandName(j.data.site_name)
      })
      .catch(() => {})
  }, [])

  const selected = loc.pathname.startsWith('/posts')
    ? ['/posts']
    : loc.pathname.startsWith('/categories')
      ? ['/categories']
      : loc.pathname.startsWith('/tags')
        ? ['/tags']
        : loc.pathname.startsWith('/media')
          ? ['/media']
          : loc.pathname.startsWith('/demos')
            ? ['/demos']
            : loc.pathname.startsWith('/demo-categories')
              ? ['/demo-categories']
              : loc.pathname.startsWith('/services')
                ? ['/services']
                : loc.pathname.startsWith('/site-settings')
                  ? ['/site-settings']
                  : loc.pathname.startsWith('/users')
                    ? ['/users']
                    : loc.pathname.startsWith('/roles')
                      ? ['/roles']
                      : []

  const breadcrumbItems = [
    { title: <HomeOutlined /> },
    {
      title:
        selected[0] === '/posts'
          ? '文章'
          : selected[0] === '/categories'
            ? '分类'
            : selected[0] === '/tags'
              ? '标签'
              : selected[0] === '/media'
                ? '媒体'
                : selected[0] === '/demos'
                  ? 'Demo'
                : selected[0] === '/demo-categories'
                  ? 'Demo 分类'
                  : selected[0] === '/services'
                    ? '技术服务'
                    : selected[0] === '/site-settings'
                      ? '站点设置'
                      : selected[0] === '/users'
                        ? '管理员'
                        : selected[0] === '/roles'
                          ? '角色与权限'
                          : '管理',
    },
  ]

  return (
    <Layout style={{ minHeight: '100vh', background: '#f3f6fb' }}>
      <Sider breakpoint="lg" collapsedWidth={0} width={220}>
        <div
          style={{
            padding: '16px 14px 18px',
            color: '#fff',
            fontWeight: 700,
            letterSpacing: 0.3,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <AdminLogoMark size={34} />
          <div style={{ lineHeight: 1.25 }}>
            <div>{brandName}</div>
            <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.82, marginTop: 2 }}>管理后台</div>
          </div>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selected}
          style={{ borderInlineEnd: 0, paddingInline: 8 }}
          items={[
            { key: '/posts', icon: <FileTextOutlined />, label: '文章', onClick: () => nav('/posts') },
            { key: '/categories', icon: <FolderOutlined />, label: '分类', onClick: () => nav('/categories') },
            { key: '/tags', icon: <TagsOutlined />, label: '标签', onClick: () => nav('/tags') },
            { key: '/media', icon: <PictureOutlined />, label: '媒体', onClick: () => nav('/media') },
            { key: '/demos', icon: <HomeOutlined />, label: 'Demo', onClick: () => nav('/demos') },
            { key: '/demo-categories', icon: <FolderOutlined />, label: 'Demo 分类', onClick: () => nav('/demo-categories') },
            { key: '/services', icon: <SafetyCertificateOutlined />, label: '技术服务', onClick: () => nav('/services') },
            { key: '/site-settings', icon: <GlobalOutlined />, label: '站点设置', onClick: () => nav('/site-settings') },
            { key: '/users', icon: <UserSwitchOutlined />, label: '管理员', onClick: () => nav('/users') },
            { key: '/roles', icon: <SafetyCertificateOutlined />, label: '角色与权限', onClick: () => nav('/roles') },
          ]}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            borderBottom: '1px solid #e2e8f0',
            padding: '0 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <Breadcrumb items={breadcrumbItems} />
          <Dropdown
            menu={{
              items: [
                {
                  key: 'profile',
                  label: '个人设置',
                  onClick: () => nav('/profile'),
                },
                {
                  key: 'out',
                  icon: <LogoutOutlined />,
                  label: '退出',
                  onClick: () => {
                    logout()
                    nav('/login')
                  },
                },
              ],
            }}
          >
            <Space style={{ cursor: 'pointer' }}>
              <Avatar size="small" icon={<UserOutlined />} />
              <Typography.Text>{user?.username}</Typography.Text>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ margin: 20, minHeight: 360 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

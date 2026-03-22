import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Descriptions, Popconfirm, Space, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import api, { unwrap } from '../services/api'
import { useAuth } from '../auth'

dayjs.extend(utc)

type Limits = {
  max_failures_before_lock: number
  lock_minutes: number
  captcha_ttl_minutes: number
}

type ThrottleRow = {
  kind: string
  value: string
  failures: number
  locked: boolean
  locked_until?: string
}

type AttemptRow = {
  at: string
  ip: string
  device_id?: string
  username?: string
  success: boolean
  detail: string
}

type Panel = {
  config: Limits
  throttle: ThrottleRow[]
  recent_attempts: AttemptRow[]
  pending_captcha_count: number
}

const detailZh: Record<string, string> = {
  locked: '已冻结（次数过多）',
  captcha: '滑块验证失败',
  bad_password: '密码错误',
  ok: '登录成功',
}

export default function LoginSecurityPage() {
  const { hasPerm } = useAuth()
  const canClear = hasPerm('user:manage')
  const [loading, setLoading] = useState(false)
  const [panel, setPanel] = useState<Panel | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/v1/admin/login-security')
      setPanel(unwrap<Panel>(res))
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const clearThrottle = useCallback(
    async (row: ThrottleRow) => {
      try {
        await api.delete('/api/v1/admin/login-security/throttle', {
          params: { kind: row.kind, value: row.value },
        })
        message.success('已清除该条限流')
        await load()
      } catch (e: unknown) {
        message.error(e instanceof Error ? e.message : '清除失败')
      }
    },
    [load],
  )

  const throttleCols: ColumnsType<ThrottleRow> = [
    { title: '类型', dataIndex: 'kind', width: 88, render: (k: string) => (k === 'ip' ? 'IP' : '设备') },
    { title: '标识', dataIndex: 'value', ellipsis: true },
    {
      title: '当前失败计数',
      dataIndex: 'failures',
      width: 120,
      render: (n: number) => <Typography.Text strong>{n}</Typography.Text>,
    },
    {
      title: '状态',
      dataIndex: 'locked',
      width: 100,
      render: (locked: boolean) => (locked ? <Tag color="red">冻结中</Tag> : <Tag color="default">累计中</Tag>),
    },
    {
      title: '冻结至 (UTC)',
      dataIndex: 'locked_until',
      width: 200,
      render: (t?: string) => (t ? dayjs.utc(t).format('YYYY-MM-DD HH:mm:ss') : '—'),
    },
    ...(canClear
      ? [
          {
            title: '操作',
            key: 'act',
            width: 100,
            render: (_: unknown, row: ThrottleRow) => (
              <Popconfirm title="清除该 IP/设备的限流与计数？" onConfirm={() => void clearThrottle(row)}>
                <Button type="link" size="small" danger>
                  清除
                </Button>
              </Popconfirm>
            ),
          },
        ]
      : []),
  ]

  const attemptCols: ColumnsType<AttemptRow> = [
    {
      title: '时间 (本地)',
      dataIndex: 'at',
      width: 168,
      render: (t: string) => dayjs.utc(t).local().format('YYYY-MM-DD HH:mm:ss'),
    },
    { title: 'IP', dataIndex: 'ip', width: 140, ellipsis: true },
    { title: '设备 ID', dataIndex: 'device_id', ellipsis: true, render: (d?: string) => d || '—' },
    { title: '用户名', dataIndex: 'username', width: 120, ellipsis: true, render: (u?: string) => u || '—' },
    {
      title: '结果',
      dataIndex: 'success',
      width: 80,
      render: (ok: boolean) => (ok ? <Tag color="green">成功</Tag> : <Tag color="orange">失败</Tag>),
    },
    {
      title: '说明',
      dataIndex: 'detail',
      render: (d: string) => detailZh[d] || d,
    },
  ]

  return (
    <div>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        登录安全
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        展示管理后台登录限流状态与最近尝试记录（数据保存在 API 进程内存中，重启后清空）。
      </Typography.Paragraph>

      {panel ? (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Descriptions size="small" column={{ xs: 1, sm: 2, md: 4 }}>
            <Descriptions.Item label="失败锁定阈值">{panel.config.max_failures_before_lock} 次</Descriptions.Item>
            <Descriptions.Item label="锁定时长">{panel.config.lock_minutes} 分钟</Descriptions.Item>
            <Descriptions.Item label="验证码有效期">{panel.config.captcha_ttl_minutes} 分钟</Descriptions.Item>
            <Descriptions.Item label="未消费滑块验证码数">{panel.pending_captcha_count}</Descriptions.Item>
          </Descriptions>
        </Card>
      ) : null}

      <Space style={{ marginBottom: 12 }}>
        <Button onClick={() => void load()} loading={loading}>
          刷新
        </Button>
      </Space>

      <Card title="当前限流 / 冻结（按 IP 与设备分别统计）" style={{ marginBottom: 16 }}>
        <Table<ThrottleRow>
          rowKey={(r) => `${r.kind}:${r.value}`}
          loading={loading}
          columns={throttleCols}
          dataSource={panel?.throttle ?? []}
          pagination={false}
          locale={{ emptyText: '暂无活跃限流记录' }}
        />
      </Card>

      <Card title="最近登录尝试（最多 200 条）">
        <Table<AttemptRow>
          rowKey={(r, i) => `${r.at}-${r.ip}-${i}`}
          loading={loading}
          columns={attemptCols}
          dataSource={panel?.recent_attempts ?? []}
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </div>
  )
}

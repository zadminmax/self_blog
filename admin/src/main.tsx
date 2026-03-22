import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider, App as AntApp, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#2563eb',
          borderRadius: 10,
          colorBgLayout: '#f3f6fb',
          fontSize: 14,
        },
        components: {
          Layout: {
            siderBg: '#0f172a',
            headerBg: '#ffffff',
          },
          Menu: {
            darkItemBg: '#0f172a',
            darkItemSelectedBg: '#1d4ed8',
          },
          Card: {
            borderRadiusLG: 12,
          },
        },
      }}
    >
      <AntApp>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  </StrictMode>
)

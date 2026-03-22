import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth'
import MainLayout from './layouts/MainLayout'
import LoginPage from './pages/Login'
import PostListPage from './pages/PostList'
import PostEditPage from './pages/PostEdit'
import CategoryListPage from './pages/CategoryList'
import TagListPage from './pages/TagList'
import AdminUserPage from './pages/AdminUserPage'
import RolePermissionPage from './pages/RolePermissionPage'
import MediaListPage from './pages/MediaListPage'
import ProfilePage from './pages/ProfilePage'
import DemoListPage from './pages/DemoListPage'
import DemoCategoryPage from './pages/DemoCategoryPage'
import ServiceOfferPage from './pages/ServiceOfferPage'
import SiteSettingsPage from './pages/SiteSettingsPage'

function Protected({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <Protected>
            <MainLayout />
          </Protected>
        }
      >
        <Route index element={<Navigate to="/posts" replace />} />
        <Route path="posts" element={<PostListPage />} />
        <Route path="posts/:id" element={<PostEditPage />} />
        <Route path="categories" element={<CategoryListPage />} />
        <Route path="tags" element={<TagListPage />} />
        <Route path="media" element={<MediaListPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="demos" element={<DemoListPage />} />
        <Route path="demo-categories" element={<DemoCategoryPage />} />
        <Route path="services" element={<ServiceOfferPage />} />
        <Route path="site-settings" element={<SiteSettingsPage />} />
        <Route path="users" element={<AdminUserPage />} />
        <Route path="roles" element={<RolePermissionPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/posts" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

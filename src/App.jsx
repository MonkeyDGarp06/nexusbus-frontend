import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/Layout'
import Register from './pages/Register'
import Explore from './pages/Explore'
import RoutesPage from './pages/Routes'
import RouteDetail from './pages/RouteDetail'
import StopsPage from './pages/Stops'
import StopDetail from './pages/StopDetail'
import DriverPanel from './pages/DriverPanel'
import AdminPanel from './pages/AdminPanel'
import DriverProfile from './pages/DriverProfile'
import SearchPage from './pages/SearchPage'

function RequireRole({ roles, children }) {
  const { user } = useAuth()
  const role = user?.role?.toLowerCase()
  if (!roles.includes(role)) return <Navigate to="/explore" replace />
  return children
}

function AppInner() {
  const [hasActiveTrip, setHasActiveTrip] = useState(false)

  return (
    <Routes>
      <Route path="/register" element={<Register />} />
      <Route path="/*" element={
        <Layout hasActiveTrip={hasActiveTrip}>
          <Routes>
            <Route path="/" element={<Navigate to="/explore" replace />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/routes" element={<RoutesPage />} />
            <Route path="/routes/:id" element={<RouteDetail />} />
            <Route path="/stops" element={<StopsPage />} />
            <Route path="/stops/:id" element={<StopDetail />} />
            <Route path="/driver" element={
              <RequireRole roles={['driver', 'admin']}>
                <DriverPanel onTripChange={setHasActiveTrip} />
              </RequireRole>
            } />
            <Route path="/admin" element={
              <RequireRole roles={['admin']}>
                <AdminPanel />
              </RequireRole>
            } />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/driver-profile/:email" element={
              <RequireRole roles={['admin']}>
                <DriverProfile />
              </RequireRole>
            } />
            <Route path="*" element={<Navigate to="/explore" replace />} />
          </Routes>
        </Layout>
      } />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppInner />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

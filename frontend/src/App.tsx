import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import ProtectedRoute from './auth/ProtectedRoute.tsx'

const Home = lazy(() => import('./pages/Home.tsx'))
const Login = lazy(() => import('./pages/Login.tsx'))
const Register = lazy(() => import('./pages/Register.tsx'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.tsx'))
const ResetPassword = lazy(() => import('./pages/ResetPassword.tsx'))
const Dashboard = lazy(() => import('./pages/Dashboard.tsx'))
const TerminalWorkspace = lazy(() => import('./pages/TerminalWorkspace.tsx'))
const ConnectionHistory = lazy(() => import('./pages/ConnectionHistory.tsx'))
const AdminUsers = lazy(() => import('./pages/AdminUsers.tsx'))
const Settings = lazy(() => import('./pages/Settings.tsx'))

// Route components are code-split (see the lazy() calls above) so that, eg.,
// loading /dashboard doesn't also pull in xterm.js and socket.io-client for
// /terminal, or the admin page's code, before either is ever visited.
function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="opacity-60">Loading…</p>
    </div>
  )
}

function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/terminal"
          element={
            <ProtectedRoute>
              <TerminalWorkspace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <ConnectionHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  )
}

export default App

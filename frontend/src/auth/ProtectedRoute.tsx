import type { FC, ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext.tsx'

const ProtectedRoute: FC<{ children: ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="opacity-60">Loading…</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute

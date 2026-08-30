import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext.tsx'
import ThemeToggle from '../components/ThemeToggle.tsx'
import Logo from '../components/Logo.tsx'

function Home() {
  const [status, setStatus] = useState('checking...')
  const { user, loading } = useAuth()

  useEffect(() => {
    api
      .health()
      .then((data) => setStatus(data.status))
      .catch(() => setStatus('unreachable'))
  }, [])

  return (
    <main className="relative flex min-h-screen items-center justify-center p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="card preset-filled-surface-100-900 w-full max-w-md space-y-4 p-6 text-center">
        <div className="flex justify-center">
          <Logo size={48} />
        </div>
        <p className="opacity-60">
          Backend status: <strong>{status}</strong>
        </p>
        {!loading && (
          <div className="flex justify-center gap-2">
            {user ? (
              <Link className="btn preset-filled-primary-700-300" to="/dashboard">
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link className="btn preset-filled-primary-700-300" to="/login">
                  Log in
                </Link>
                <Link className="btn preset-tonal" to="/register">
                  Register
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

export default Home
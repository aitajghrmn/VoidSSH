import { HugeiconsIcon } from '@hugeicons/react'
import { Delete02Icon, Refresh01Icon, Settings01Icon } from '@hugeicons/core-free-icons'
import { AppBar } from '@skeletonlabs/skeleton-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext.tsx'
import ThemeToggle from '../components/ThemeToggle.tsx'
import type { AdminUser } from '../types'

function AdminUsers() {
  const { user } = useAuth()

  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const loadUsers = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      setUsers(await api.listAdminUsers())
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleDelete = async (target: AdminUser) => {
    if (!window.confirm(`Delete user "${target.username}" and all their connections?`)) return
    setDeleteError(null)
    setDeletingId(target.id)
    try {
      await api.deleteAdminUser(target.id)
      await loadUsers()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : String(err))
    } finally {
      setDeletingId(null)
    }
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="card preset-filled-surface-100-900 flex flex-col items-center gap-3 p-12 text-center">
          <h2 className="h3">Admins only</h2>
          <p className="opacity-60">You don&rsquo;t have access to this page.</p>
          <Link to="/dashboard" className="btn preset-tonal">
            Back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <AppBar>
        <AppBar.Toolbar className="grid-cols-1 gap-2 sm:grid-cols-[auto_1fr_auto]">
          <AppBar.Lead>
            <p className="h4">Users</p>
          </AppBar.Lead>
          <AppBar.Headline />
          <AppBar.Trail className="flex-wrap items-center justify-end gap-2">
            <Link to="/dashboard" className="btn btn-sm preset-tonal">
              Back to dashboard
            </Link>
            <Link to="/settings" className="btn btn-sm preset-tonal">
              <HugeiconsIcon icon={Settings01Icon} size={16} strokeWidth={1.5} />
              Settings
            </Link>
            <ThemeToggle />
          </AppBar.Trail>
        </AppBar.Toolbar>
      </AppBar>

      <main className="mx-auto max-w-4xl space-y-4 p-6">
        {deleteError && <p className="text-error-500 text-sm">{deleteError}</p>}

        {loading && <p className="opacity-60">Loading users…</p>}

        {!loading && loadError && (
          <div className="card preset-filled-surface-100-900 flex flex-col items-center gap-3 p-12 text-center">
            <h2 className="h3">Couldn&rsquo;t load users</h2>
            <p className="text-error-500 text-sm">{loadError}</p>
            <button type="button" className="btn preset-tonal" onClick={loadUsers}>
              <HugeiconsIcon icon={Refresh01Icon} size={16} strokeWidth={1.5} />
              Retry
            </button>
          </div>
        )}

        {!loading && !loadError && (
          <ul className="space-y-2">
            {users.map((target) => {
              const isDeleting = deletingId === target.id
              const isSelf = user?.id === target.id
              return (
                <li
                  key={target.id}
                  className="card preset-filled-surface-100-900 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold break-words">
                      {target.username}
                      {isSelf && <span className="opacity-60"> (you)</span>}
                    </p>
                    <p className="text-sm opacity-60 break-words">{target.email}</p>
                    <p className="text-xs opacity-60">
                      {target.connection_count} connection{target.connection_count === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <span className="badge preset-tonal text-xs">{target.role}</span>
                    <button
                      type="button"
                      className="btn btn-sm preset-tonal-error"
                      onClick={() => handleDelete(target)}
                      disabled={isDeleting || isSelf}
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={1.5} />
                      {isDeleting ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}

export default AdminUsers

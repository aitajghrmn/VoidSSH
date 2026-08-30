import { HugeiconsIcon } from '@hugeicons/react'
import { PlusSignIcon, Refresh01Icon, Settings01Icon } from '@hugeicons/core-free-icons'
import { AppBar } from '@skeletonlabs/skeleton-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext.tsx'
import ConnectionForm from '../components/ConnectionForm.tsx'
import ConnectionList from '../components/ConnectionList.tsx'
import ThemeToggle from '../components/ThemeToggle.tsx'
import Logo from '../components/Logo.tsx'
import type { ConnectionPayload, SSHConnection } from '../types'

type FormMode = null | 'create' | SSHConnection

function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [connections, setConnections] = useState<SSHConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formMode, setFormMode] = useState<FormMode>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [activeTag, setActiveTag] = useState<string | null>(null)

  const loadConnections = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      setConnections(await api.listConnections())
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConnections()
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleCreate = async (payload: ConnectionPayload) => {
    await api.createConnection(payload)
    setFormMode(null)
    await loadConnections()
  }

  const handleUpdate = async (payload: ConnectionPayload) => {
    if (!formMode || formMode === 'create') return
    await api.updateConnection(formMode.id, payload)
    setFormMode(null)
    await loadConnections()
  }

  const handleDelete = async (connection: SSHConnection) => {
    if (!window.confirm(`Delete connection "${connection.name}"?`)) return
    setDeleteError(null)
    setDeletingId(connection.id)
    try {
      await api.deleteConnection(connection.id)
      await loadConnections()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : String(err))
    } finally {
      setDeletingId(null)
    }
  }

  const isEditing = formMode !== null && formMode !== 'create'

  const allTags = [...new Set(connections.flatMap((c) => c.tags))].sort()
  const visibleConnections = activeTag
    ? connections.filter((c) => c.tags.includes(activeTag))
    : connections

  return (
    <div className="min-h-screen">
      <AppBar>
        <AppBar.Toolbar className="grid-cols-1 gap-2 sm:grid-cols-[auto_1fr_auto]">
          <AppBar.Lead>
            <Logo size={28} />
          </AppBar.Lead>
          <AppBar.Headline />
          <AppBar.Trail className="flex-wrap items-center justify-end gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Link to="/history" className="btn btn-sm preset-tonal">
                History
              </Link>
              {user?.role === 'admin' && (
                <Link to="/admin" className="btn btn-sm preset-tonal">
                  Users
                </Link>
              )}
              <Link to="/settings" className="btn btn-sm preset-tonal">
                <HugeiconsIcon icon={Settings01Icon} size={16} strokeWidth={1.5} />
                Settings
              </Link>
              <ThemeToggle />
            </div>
            <div className="border-surface-500/30 flex items-center gap-2 border-l pl-3">
              <span className="badge-icon preset-filled-primary-700-300 text-xs">
                {user?.username?.[0]?.toUpperCase()}
              </span>
              <span className="text-sm opacity-70">{user?.username}</span>
              <button type="button" className="btn btn-sm preset-outlined" onClick={handleLogout}>
                Log out
              </button>
            </div>
          </AppBar.Trail>
        </AppBar.Toolbar>
      </AppBar>

      <main className="mx-auto max-w-4xl space-y-4 p-6">
        {formMode && (
          <ConnectionForm
            key={isEditing ? (formMode as SSHConnection).id : 'create'}
            isEditing={isEditing}
            initialValues={isEditing ? (formMode as SSHConnection) : undefined}
            onSubmit={isEditing ? handleUpdate : handleCreate}
            onCancel={() => setFormMode(null)}
          />
        )}

        {!formMode && (
          <div className="flex justify-end">
            <button
              type="button"
              className="btn preset-filled-primary-700-300"
              onClick={() => setFormMode('create')}
            >
              <HugeiconsIcon icon={PlusSignIcon} size={16} strokeWidth={1.5} />
              Add connection
            </button>
          </div>
        )}

        {deleteError && <p className="text-error-500 text-sm">{deleteError}</p>}

        {!formMode && allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm opacity-60">Filter:</span>
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                className={
                  activeTag === tag
                    ? 'badge preset-filled-primary-700-300 text-xs'
                    : 'badge preset-tonal text-xs'
                }
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              >
                {tag}
              </button>
            ))}
            {activeTag && (
              <button
                type="button"
                className="btn btn-sm preset-tonal"
                onClick={() => setActiveTag(null)}
              >
                Clear
              </button>
            )}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <p className="opacity-60">Loading connections…</p>
          </div>
        )}

        {!loading && loadError && (
          <div className="card preset-filled-surface-100-900 flex flex-col items-center gap-3 p-12 text-center">
            <h2 className="h3">Couldn&rsquo;t load your connections</h2>
            <p className="text-error-500 text-sm">{loadError}</p>
            <button type="button" className="btn preset-tonal" onClick={loadConnections}>
              <HugeiconsIcon icon={Refresh01Icon} size={16} strokeWidth={1.5} />
              Retry
            </button>
          </div>
        )}

        {!loading && !loadError && connections.length === 0 && (
          <div className="card preset-filled-surface-100-900 flex flex-col items-center gap-3 p-12 text-center">
            <h2 className="h3">No connections yet</h2>
            <p className="opacity-60">Add your first SSH connection to get started.</p>
          </div>
        )}

        {!loading && !loadError && connections.length > 0 && visibleConnections.length === 0 && (
          <div className="card preset-filled-surface-100-900 flex flex-col items-center gap-3 p-12 text-center">
            <h2 className="h3">No connections tagged &ldquo;{activeTag}&rdquo;</h2>
            <button type="button" className="btn preset-tonal" onClick={() => setActiveTag(null)}>
              Clear filter
            </button>
          </div>
        )}

        {!loading && !loadError && visibleConnections.length > 0 && (
          <ConnectionList
            connections={visibleConnections}
            deletingId={deletingId}
            onEdit={(connection) => setFormMode(connection)}
            onDelete={handleDelete}
            onTagClick={setActiveTag}
          />
        )}
      </main>
    </div>
  )
}

export default Dashboard

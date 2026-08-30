import { HugeiconsIcon } from '@hugeicons/react'
import { Delete02Icon, PencilEdit02Icon, TerminalIcon } from '@hugeicons/core-free-icons'
import { Link } from 'react-router-dom'
import type { SSHConnection } from '../types'

interface ConnectionListProps {
  connections: SSHConnection[]
  onEdit: (connection: SSHConnection) => void
  onDelete: (connection: SSHConnection) => void
  deletingId?: number | null
  onTagClick?: (tag: string) => void
}

function ConnectionList({
  connections,
  onEdit,
  onDelete,
  deletingId = null,
  onTagClick,
}: ConnectionListProps) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {connections.map((connection) => {
        const isDeleting = deletingId === connection.id
        return (
          <li
            key={connection.id}
            className="card preset-filled-surface-100-900 min-w-0 space-y-2 p-4"
            aria-busy={isDeleting}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold break-words">{connection.name}</p>
                <p className="text-sm opacity-60 break-words">
                  {connection.username}@{connection.host}:{connection.port}
                </p>
              </div>
              <span className="badge preset-tonal shrink-0 text-xs">
                {connection.auth_type === 'key' ? 'SSH key' : 'Password'}
              </span>
            </div>
            {connection.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {connection.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="badge preset-tonal-primary text-xs"
                    onClick={() => onTagClick?.(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Link
                to="/terminal"
                state={{ connectionId: connection.id }}
                className="btn btn-sm preset-filled-primary-700-300"
              >
                <HugeiconsIcon icon={TerminalIcon} size={16} strokeWidth={1.5} />
                Connect
              </Link>
              <button
                type="button"
                className="btn btn-sm preset-tonal"
                onClick={() => onEdit(connection)}
                disabled={isDeleting}
              >
                <HugeiconsIcon icon={PencilEdit02Icon} size={16} strokeWidth={1.5} />
                Edit
              </button>
              <button
                type="button"
                className="btn btn-sm preset-tonal-error"
                onClick={() => onDelete(connection)}
                disabled={isDeleting}
              >
                <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={1.5} />
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default ConnectionList

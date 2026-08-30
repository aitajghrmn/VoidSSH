import { AppBar } from '@skeletonlabs/skeleton-react'
import { useEffect, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Refresh01Icon, Settings01Icon, ViewIcon, ViewOffIcon } from '@hugeicons/core-free-icons'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import ThemeToggle from '../components/ThemeToggle.tsx'
import type { ConnectionLogEntry } from '../types'

function formatDuration(startedAt: string | null, endedAt: string | null): string {
  if (!startedAt || !endedAt) return '—'
  const seconds = Math.max(0, Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ${seconds % 60}s`
}

// The recording is the raw terminal byte stream (as stored server-side), so
// it still carries ANSI control sequences (cursor moves, color codes,
// bracketed-paste toggles). Strip them for a readable plain-text transcript.
function stripAnsi(text: string): string {
  return text
    .replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '')
    .replace(/\x1b\][^\x07]*(\x07|\x1b\\)/g, '')
    .replace(/\x1b[()][0-9A-Za-z]/g, '')
    .replace(/\x1b[=>]/g, '')
}

function LogEntry({ log }: { log: ConnectionLogEntry }) {
  const [expanded, setExpanded] = useState(false)
  const [recording, setRecording] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleRecording = async () => {
    if (expanded) {
      setExpanded(false)
      return
    }
    setExpanded(true)
    if (recording !== null || loading) return
    setLoading(true)
    setError(null)
    try {
      const result = await api.getConnectionLogRecording(log.id)
      setRecording(result.recording ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <li className="card preset-filled-surface-100-900 space-y-2 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold break-words">{log.connection_name}</p>
          <p className="text-sm opacity-60 break-words">
            {log.username}@{log.host}:{log.port}
          </p>
          {log.status === 'failed' && log.error_message && (
            <p className="text-error-500 mt-1 text-sm break-words">{log.error_message}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-right">
          <span
            className={
              log.status === 'success'
                ? 'badge preset-filled-success-500 text-xs'
                : 'badge preset-filled-error-500 text-xs'
            }
          >
            {log.status === 'success' ? 'Connected' : 'Failed'}
          </span>
          <span className="text-xs opacity-60">
            {log.started_at ? new Date(log.started_at).toLocaleString() : '—'}
          </span>
          {log.status === 'success' && (
            <span className="text-xs opacity-60">
              duration: {formatDuration(log.started_at, log.ended_at)}
            </span>
          )}
        </div>
      </div>

      {log.has_recording && (
        <div>
          <button type="button" className="btn btn-sm preset-tonal" onClick={toggleRecording}>
            <HugeiconsIcon icon={expanded ? ViewOffIcon : ViewIcon} size={16} strokeWidth={1.5} />
            {expanded ? 'Hide recording' : 'View recording'}
          </button>
          {expanded && (
            <div className="mt-2">
              {loading && <p className="text-sm opacity-60">Loading recording…</p>}
              {error && <p className="text-error-500 text-sm">{error}</p>}
              {!loading && !error && recording !== null && (
                <pre className="max-h-96 overflow-auto rounded-md bg-black p-3 text-xs whitespace-pre-wrap text-white/80">
                  {stripAnsi(recording) || '(empty)'}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  )
}

function ConnectionHistory() {
  const [logs, setLogs] = useState<ConnectionLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      setLogs(await api.listConnectionLogs())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  return (
    <div className="min-h-screen">
      <AppBar>
        <AppBar.Toolbar className="grid-cols-1 gap-2 sm:grid-cols-[auto_1fr_auto]">
          <AppBar.Lead>
            <p className="h4">Connection history</p>
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
        {loading && <p className="opacity-60">Loading history…</p>}

        {!loading && error && (
          <div className="card preset-filled-surface-100-900 flex flex-col items-center gap-3 p-12 text-center">
            <h2 className="h3">Couldn&rsquo;t load connection history</h2>
            <p className="text-error-500 text-sm">{error}</p>
            <button type="button" className="btn preset-tonal" onClick={loadLogs}>
              <HugeiconsIcon icon={Refresh01Icon} size={16} strokeWidth={1.5} />
              Retry
            </button>
          </div>
        )}

        {!loading && !error && logs.length === 0 && (
          <div className="card preset-filled-surface-100-900 flex flex-col items-center gap-3 p-12 text-center">
            <h2 className="h3">No connection attempts yet</h2>
            <p className="opacity-60">Connect to a server to see it show up here.</p>
          </div>
        )}

        {!loading && !error && logs.length > 0 && (
          <ul className="space-y-2">
            {logs.map((log) => (
              <LogEntry key={log.id} log={log} />
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

export default ConnectionHistory

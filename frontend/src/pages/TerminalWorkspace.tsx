import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon, PlusSignIcon } from '@hugeicons/core-free-icons'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '../api/client'
import TerminalSession, { type SessionStatus } from '../components/TerminalSession.tsx'
import type { SSHConnection } from '../types'

interface Tab {
  id: string
  connectionId: number
  status: SessionStatus
}

function connectionName(connections: SSHConnection[], connectionId: number): string {
  return connections.find((c) => c.id === connectionId)?.name ?? `#${connectionId}`
}

function statusDotClass(status: SessionStatus): string {
  if (status === 'connected') return 'preset-filled-success-500'
  if (status === 'error') return 'preset-filled-error-500'
  if (status === 'closed') return 'preset-tonal'
  return 'preset-filled-warning-500'
}

function TerminalWorkspace() {
  const location = useLocation()
  const [connections, setConnections] = useState<SSHConnection[]>([])
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const processedLocationKey = useRef<string | null>(null)

  useEffect(() => {
    api.listConnections().then(setConnections).catch(() => {})
  }, [])

  // The browser reserves shortcuts like Ctrl/Cmd+W and Ctrl/Cmd+R for itself —
  // no web page can intercept or remap them — so the only thing we can do to
  // stop an active session from being closed by muscle memory is warn before
  // the tab actually unloads.
  useEffect(() => {
    const hasActiveSession = tabs.some((t) => t.status === 'connected' || t.status === 'connecting')
    if (!hasActiveSession) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [tabs])

  const openTab = (connectionId: number) => {
    const tabId = `${connectionId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setTabs((prev) => [...prev, { id: tabId, connectionId, status: 'connecting' }])
    setActiveTabId(tabId)
    setPickerOpen(false)
  }

  useEffect(() => {
    const state = location.state as { connectionId?: number } | null
    if (state?.connectionId && location.key !== processedLocationKey.current) {
      processedLocationKey.current = location.key
      openTab(state.connectionId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location])

  const closeTab = (tabId: string) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== tabId)
      if (activeTabId === tabId) {
        setActiveTabId(next.length > 0 ? next[next.length - 1].id : null)
      }
      return next
    })
  }

  const updateTabStatus = (tabId: string, status: SessionStatus) => {
    setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, status } : t)))
  }

  return (
    <div className="flex h-screen flex-col bg-black">
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-2 py-2">
        <Link to="/dashboard" className="btn btn-sm preset-tonal shrink-0">
          Dashboard
        </Link>

        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <span
              key={tab.id}
              className={
                'flex shrink-0 cursor-pointer items-center gap-2 rounded px-3 py-1.5 text-sm ' +
                (tab.id === activeTabId ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/10')
              }
              onClick={() => setActiveTabId(tab.id)}
            >
              <span className={`badge-dot ${statusDotClass(tab.status)}`} />
              {connectionName(connections, tab.connectionId)}
              <button
                type="button"
                aria-label="Close tab"
                onClick={(event) => {
                  event.stopPropagation()
                  closeTab(tab.id)
                }}
                className="-my-2 p-2 opacity-60 hover:opacity-100"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={1.5} />
              </button>
            </span>
          ))}
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            className="btn btn-sm preset-filled-primary-700-300"
            onClick={() => setPickerOpen((v) => !v)}
          >
            <HugeiconsIcon icon={PlusSignIcon} size={16} strokeWidth={1.5} />
            New
          </button>
          {pickerOpen && (
            <div className="preset-filled-surface-100-900 absolute right-0 top-full z-10 mt-1 w-56 rounded-md p-1 shadow-lg">
              {connections.length === 0 && (
                <p className="px-3 py-2 text-sm opacity-60">No connections yet</p>
              )}
              {connections.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-white/10"
                  onClick={() => openTab(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <main className="relative min-h-0 flex-1">
        {tabs.length === 0 && (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <p className="text-white/60">No active sessions.</p>
              <Link to="/dashboard" className="anchor mt-2 inline-block">
                Go to the dashboard to connect
              </Link>
            </div>
          </div>
        )}
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={tab.id === activeTabId ? 'absolute inset-0' : 'invisible absolute inset-0 pointer-events-none'}
          >
            <TerminalSession
              connectionId={tab.connectionId}
              active={tab.id === activeTabId}
              onStatusChange={(status) => updateTabStatus(tab.id, status)}
            />
          </div>
        ))}
      </main>
    </div>
  )
}

export default TerminalWorkspace

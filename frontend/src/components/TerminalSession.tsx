import { HugeiconsIcon } from '@hugeicons/react'
import { Refresh01Icon } from '@hugeicons/core-free-icons'
import { useEffect, useRef, useState } from 'react'
import type { Socket } from 'socket.io-client'
import Terminal, { type TerminalHandle } from './Terminal.tsx'
import { createSshSocket } from '../terminal/socket.ts'
import { usePreferences } from '../theme/PreferencesContext.tsx'
import { getTerminalTheme } from '../theme/terminalThemes.ts'
import type { SSHErrorEvent, SSHOutputEvent } from '../types'

export type SessionStatus = 'connecting' | 'connected' | 'closed' | 'error'

interface TerminalSessionProps {
  connectionId: number
  active: boolean
  onStatusChange: (status: SessionStatus, error: string | null) => void
}

function TerminalSession({ connectionId, active, onStatusChange }: TerminalSessionProps) {
  const terminalRef = useRef<TerminalHandle>(null)
  const socketRef = useRef<Socket | null>(null)
  const { terminalFontSize, terminalThemeId, terminalFontFamily, terminalCursorStyle } = usePreferences()

  const [status, setStatus] = useState<SessionStatus>('connecting')
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  const updateStatus = (next: SessionStatus, nextError: string | null) => {
    setStatus(next)
    setError(nextError)
    onStatusChange(next, nextError)
  }

  useEffect(() => {
    updateStatus('connecting', null)
    terminalRef.current?.reset()

    const socket = createSshSocket()
    socketRef.current = socket

    socket.on('connect', () => {
      const size = terminalRef.current?.getSize()
      socket.emit('ssh_connect', {
        connection_id: connectionId,
        cols: size?.cols ?? 80,
        rows: size?.rows ?? 24,
      })
    })
    socket.on('ssh_connected', () => updateStatus('connected', null))
    socket.on('ssh_output', (payload: SSHOutputEvent) => {
      terminalRef.current?.write(payload.data)
    })
    socket.on('ssh_error', (payload: SSHErrorEvent) => updateStatus('error', payload.message))
    socket.on('ssh_closed', () => updateStatus('closed', null))
    socket.on('connect_error', (err: Error) => updateStatus('error', err.message))

    socket.connect()

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionId, attempt])

  useEffect(() => {
    if (active) terminalRef.current?.focus()
  }, [active])

  const handleData = (data: string) => {
    socketRef.current?.emit('ssh_input', { data })
  }

  const handleResize = (cols: number, rows: number) => {
    socketRef.current?.emit('ssh_resize', { cols, rows })
  }

  return (
    <div className="flex h-full w-full flex-col">
      {(status === 'closed' || status === 'error') && (
        <div className="flex items-start justify-between gap-3 border-b border-white/10 bg-black p-2">
          <span className="text-sm text-white/60">
            {status === 'closed' ? 'Session closed' : `Error: ${error}`}
          </span>
          <button
            type="button"
            className="btn btn-sm preset-filled-primary-700-300"
            onClick={() => setAttempt((n) => n + 1)}
          >
            <HugeiconsIcon icon={Refresh01Icon} size={16} strokeWidth={1.5} />
            Reconnect
          </button>
        </div>
      )}
      <div className="min-h-0 flex-1 p-2">
        <Terminal
          ref={terminalRef}
          onData={handleData}
          onResize={handleResize}
          fontSize={terminalFontSize}
          fontFamily={terminalFontFamily}
          theme={getTerminalTheme(terminalThemeId)}
          cursorStyle={terminalCursorStyle}
        />
      </div>
    </div>
  )
}

export default TerminalSession

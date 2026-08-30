import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '../theme/ThemeContext.tsx'
import ConnectionHistory from './ConnectionHistory.tsx'

const { listConnectionLogs, getConnectionLogRecording } = vi.hoisted(() => ({
  listConnectionLogs: vi.fn(),
  getConnectionLogRecording: vi.fn(),
}))

vi.mock('../api/client', () => ({
  api: { listConnectionLogs, getConnectionLogRecording },
}))

describe('ConnectionHistory', () => {
  it('shows an empty state when there are no attempts', async () => {
    listConnectionLogs.mockResolvedValueOnce([])

    render(
      <MemoryRouter>
        <ThemeProvider>
          <ConnectionHistory />
        </ThemeProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByText(/no connection attempts yet/i)).toBeInTheDocument()
  })

  it('renders success and failure entries with their status', async () => {
    listConnectionLogs.mockResolvedValueOnce([
      {
        id: 1,
        connection_id: 1,
        connection_name: 'prod-box',
        host: '10.0.0.5',
        port: 22,
        username: 'deploy',
        status: 'success',
        error_message: null,
        has_recording: false,
        started_at: '2026-08-16T10:00:00Z',
        ended_at: '2026-08-16T10:00:05Z',
      },
      {
        id: 2,
        connection_id: 2,
        connection_name: 'bad-box',
        host: '10.0.0.6',
        port: 22,
        username: 'deploy',
        status: 'failed',
        error_message: 'SSH authentication failed',
        has_recording: false,
        started_at: '2026-08-16T10:05:00Z',
        ended_at: '2026-08-16T10:05:00Z',
      },
    ])

    render(
      <MemoryRouter>
        <ThemeProvider>
          <ConnectionHistory />
        </ThemeProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByText('prod-box')).toBeInTheDocument()
    expect(screen.getByText('Connected')).toBeInTheDocument()
    expect(screen.getByText('bad-box')).toBeInTheDocument()
    expect(screen.getByText('Failed')).toBeInTheDocument()
    expect(screen.getByText('SSH authentication failed')).toBeInTheDocument()
    expect(screen.queryByText(/view recording/i)).not.toBeInTheDocument()
  })

  it('fetches and shows the recording only when the button is clicked', async () => {
    listConnectionLogs.mockResolvedValueOnce([
      {
        id: 3,
        connection_id: 3,
        connection_name: 'recorded-box',
        host: '10.0.0.7',
        port: 22,
        username: 'deploy',
        status: 'success',
        error_message: null,
        has_recording: true,
        started_at: '2026-08-16T10:10:00Z',
        ended_at: '2026-08-16T10:10:05Z',
      },
    ])
    getConnectionLogRecording.mockResolvedValueOnce({
      recording: '\x1b[?2004hwelcome to the recorded session\x1b[?2004l',
    })

    render(
      <MemoryRouter>
        <ThemeProvider>
          <ConnectionHistory />
        </ThemeProvider>
      </MemoryRouter>,
    )

    const viewButton = await screen.findByText(/view recording/i)
    expect(getConnectionLogRecording).not.toHaveBeenCalled()

    fireEvent.click(viewButton)

    await waitFor(() => expect(getConnectionLogRecording).toHaveBeenCalledWith(3))
    // ANSI control sequences (e.g. bracketed-paste mode toggles) should be
    // stripped from the raw stored transcript before display.
    expect(await screen.findByText('welcome to the recorded session')).toBeInTheDocument()
  })
})

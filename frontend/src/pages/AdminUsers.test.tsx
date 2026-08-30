import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthContext.tsx'
import { ThemeProvider } from '../theme/ThemeContext.tsx'
import AdminUsers from './AdminUsers.tsx'

const { me, listAdminUsers } = vi.hoisted(() => ({
  me: vi.fn(),
  listAdminUsers: vi.fn(),
}))

vi.mock('../api/client', () => ({
  api: { health: vi.fn().mockResolvedValue({ status: 'ok' }), me, listAdminUsers },
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <AuthProvider>
          <AdminUsers />
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>,
  )
}

describe('AdminUsers', () => {
  it('shows an access-denied message for a non-admin user', async () => {
    me.mockResolvedValueOnce({ id: 1, username: 'alice', email: 'alice@example.com', role: 'user' })

    renderPage()

    expect(await screen.findByText(/admins only/i)).toBeInTheDocument()
  })

  it('lists users for an admin', async () => {
    me.mockResolvedValueOnce({ id: 1, username: 'alice', email: 'alice@example.com', role: 'admin' })
    listAdminUsers.mockResolvedValueOnce([
      {
        id: 1,
        username: 'alice',
        email: 'alice@example.com',
        role: 'admin',
        connection_count: 2,
        created_at: null,
      },
      {
        id: 2,
        username: 'bob',
        email: 'bob@example.com',
        role: 'user',
        connection_count: 0,
        created_at: null,
      },
    ])

    renderPage()

    expect(await screen.findByText('bob')).toBeInTheDocument()
    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(screen.getByText('(you)')).toBeInTheDocument()
  })
})

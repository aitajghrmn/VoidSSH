import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { User } from '../types'
import { AuthProvider } from './AuthContext.tsx'
import ProtectedRoute from './ProtectedRoute.tsx'

const { health, me } = vi.hoisted(() => ({
  health: vi.fn().mockResolvedValue({ status: 'ok' }),
  me: vi.fn<() => Promise<User>>(),
}))

vi.mock('../api/client', () => ({
  api: { health, me },
}))

function renderProtected() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<p>login page</p>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <p>secret dashboard</p>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  it('redirects to /login when there is no signed-in user', async () => {
    me.mockRejectedValueOnce(new Error('unauthenticated'))

    renderProtected()

    expect(await screen.findByText('login page')).toBeInTheDocument()
  })

  it('renders the protected content when a user is signed in', async () => {
    me.mockResolvedValueOnce({ id: 1, username: 'alice', email: 'alice@example.com', role: 'user' })

    renderProtected()

    expect(await screen.findByText('secret dashboard')).toBeInTheDocument()
  })
})

import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthContext.tsx'
import { ThemeProvider } from '../theme/ThemeContext.tsx'
import Home from './Home.tsx'

vi.mock('../api/client', () => ({
  api: {
    health: vi.fn().mockResolvedValue({ status: 'ok' }),
    me: vi.fn().mockRejectedValue(new Error('unauthenticated')),
  },
}))

function renderHome() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <AuthProvider>
          <Home />
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>,
  )
}

describe('Home', () => {
  it('shows the backend health status once it resolves', async () => {
    renderHome()

    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument())
  })

  it('offers login/register links when no user is signed in', async () => {
    renderHome()

    expect(await screen.findByRole('link', { name: /log in/i })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: /register/i })).toHaveAttribute('href', '/register')
  })
})

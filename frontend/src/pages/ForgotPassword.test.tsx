import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '../theme/ThemeContext.tsx'
import ForgotPassword from './ForgotPassword.tsx'

const { requestPasswordReset } = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
}))

vi.mock('../api/client', () => ({
  api: { requestPasswordReset },
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <ForgotPassword />
      </ThemeProvider>
    </MemoryRouter>,
  )
}

describe('ForgotPassword', () => {
  it('shows a generic confirmation after requesting a reset link', async () => {
    requestPasswordReset.mockResolvedValueOnce({ message: 'ok' })

    renderPage()
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'alice@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }))

    expect(await screen.findByText(/if an account exists for that email/i)).toBeInTheDocument()
    expect(requestPasswordReset).toHaveBeenCalledWith('alice@example.com')
  })

  it('links back to the login page', () => {
    renderPage()

    expect(screen.getByRole('link', { name: /back to log in/i })).toHaveAttribute('href', '/login')
  })
})

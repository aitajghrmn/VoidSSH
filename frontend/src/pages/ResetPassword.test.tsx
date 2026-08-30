import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '../theme/ThemeContext.tsx'
import ResetPassword from './ResetPassword.tsx'

const { confirmPasswordReset } = vi.hoisted(() => ({
  confirmPasswordReset: vi.fn(),
}))

vi.mock('../api/client', () => ({
  api: { confirmPasswordReset },
}))

function renderPage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/login" element={<p>Login page</p>} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
  )
}

describe('ResetPassword', () => {
  beforeEach(() => {
    confirmPasswordReset.mockClear()
  })

  it('shows an error and no form when the token is missing from the URL', () => {
    renderPage('/reset-password')

    expect(screen.getByText(/missing or invalid/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/new password/i)).not.toBeInTheDocument()
  })

  it('submits the token and new password, then redirects to login', async () => {
    confirmPasswordReset.mockResolvedValueOnce(null)

    renderPage('/reset-password?token=abc123')
    fireEvent.change(screen.getByLabelText(/^new password$/i), { target: { value: 'newpassword123' } })
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: 'newpassword123' } })
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }))

    expect(await screen.findByText(/login page/i)).toBeInTheDocument()
    expect(confirmPasswordReset).toHaveBeenCalledWith('abc123', 'newpassword123')
  })

  it('shows an error when the new password and confirmation do not match', () => {
    renderPage('/reset-password?token=abc123')
    fireEvent.change(screen.getByLabelText(/^new password$/i), { target: { value: 'newpassword123' } })
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: 'different' } })
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }))

    expect(screen.getByText(/do not match/i)).toBeInTheDocument()
    expect(confirmPasswordReset).not.toHaveBeenCalled()
  })
})

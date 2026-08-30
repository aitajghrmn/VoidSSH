import { HugeiconsIcon } from '@hugeicons/react'
import { LockPasswordIcon } from '@hugeicons/core-free-icons'
import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import ThemeToggle from '../components/ThemeToggle.tsx'
import Logo from '../components/Logo.tsx'

function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match')
      return
    }
    if (!token) return
    setSubmitting(true)
    try {
      await api.confirmPasswordReset(token, newPassword)
      navigate('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSubmitting(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <Logo size={52} />
          <h1 className="h3 mt-2 mb-0">Choose a new password</h1>
        </div>

        <div className="card preset-filled-surface-100-900 space-y-4 p-6">
          {!token ? (
            <div className="space-y-3 text-center">
              <p className="text-error-500 text-sm">
                This reset link is missing or invalid.
              </p>
              <Link className="anchor text-sm" to="/forgot-password">
                Request a new link
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="space-y-2">
                  <p className="text-error-500 text-sm">{error}</p>
                  <Link className="anchor text-sm" to="/forgot-password">
                    Request a new link
                  </Link>
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
                <label className="label">
                  <span className="label-text">New password</span>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center opacity-50">
                      <HugeiconsIcon icon={LockPasswordIcon} size={18} strokeWidth={1.5} />
                    </span>
                    <input
                      className="input pl-10"
                      type="password"
                      value={newPassword}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setNewPassword(event.target.value)}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </label>
                <label className="label">
                  <span className="label-text">Confirm new password</span>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center opacity-50">
                      <HugeiconsIcon icon={LockPasswordIcon} size={18} strokeWidth={1.5} />
                    </span>
                    <input
                      className="input pl-10"
                      type="password"
                      value={confirmPassword}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setConfirmPassword(event.target.value)}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </label>

                <button className="btn preset-filled-primary-700-300 w-full" type="submit" disabled={submitting}>
                  {submitting ? 'Resetting…' : 'Reset password'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-sm">
          <Link className="anchor" to="/login">
            Back to log in
          </Link>
        </p>
      </div>
    </main>
  )
}

export default ResetPassword
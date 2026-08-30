import { HugeiconsIcon } from '@hugeicons/react'
import { Mail01Icon } from '@hugeicons/core-free-icons'
import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import ThemeToggle from '../components/ThemeToggle.tsx'
import Logo from '../components/Logo.tsx'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await api.requestPasswordReset(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
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
          <h1 className="h3 mt-2 mb-0">Reset your password</h1>
          <p className="text-sm opacity-60 mt-1">We&rsquo;ll email you a link to set a new password</p>
        </div>

        <div className="card preset-filled-surface-100-900 space-y-4 p-6">
          {sent ? (
            <p className="text-center text-sm">
              If an account exists for that email, we&rsquo;ve sent a link to reset your password.
            </p>
          ) : (
            <>
              {error && <p className="text-error-500 text-sm">{error}</p>}

              <form className="space-y-4" onSubmit={handleSubmit}>
                <label className="label">
                  <span className="label-text">Email</span>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center opacity-50">
                      <HugeiconsIcon icon={Mail01Icon} size={18} strokeWidth={1.5} />
                    </span>
                    <input
                      className="input pl-10"
                      type="email"
                      value={email}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                </label>

                <button className="btn preset-filled-primary-700-300 w-full" type="submit" disabled={submitting}>
                  {submitting ? 'Sending…' : 'Send reset link'}
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

export default ForgotPasswor

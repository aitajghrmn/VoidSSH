import { AppBar } from '@skeletonlabs/skeleton-react'
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext.tsx'
import ThemeToggle from '../components/ThemeToggle.tsx'
import { MAX_FONT_SIZE, MIN_FONT_SIZE, usePreferences } from '../theme/PreferencesContext.tsx'
import { TERMINAL_CURSOR_STYLES, TERMINAL_FONT_FAMILIES, TERMINAL_THEMES, getTerminalTheme } from '../theme/terminalThemes.ts'
import type { AppSettings } from '../types'

function AccountSection() {
  const { user, refreshUser } = useAuth()
  const [username, setUsername] = useState(user?.username ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // `user` is still null on first render (AuthContext's api.me() call
  // hasn't resolved yet), so seed the fields once it does.
  useEffect(() => {
    if (!user) return
    setUsername(user.username)
    setEmail(user.email)
  }, [user])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSaved(false)
    setSubmitting(true)
    try {
      await api.updateMe({ username, email })
      await refreshUser()
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="card preset-filled-surface-100-900 space-y-4 p-6" onSubmit={handleSubmit}>
      <h2 className="h4">Account</h2>
      {error && <p className="text-error-500 text-sm">{error}</p>}
      {saved && <p className="text-success-500 text-sm">Saved.</p>}
      <fieldset className="fieldset grid gap-4 sm:grid-cols-2">
        <label className="label min-w-0">
          <span className="label-text">Username</span>
          <input
            className="input"
            type="text"
            value={username}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setUsername(event.target.value)}
            required
          />
        </label>
        <label className="label min-w-0">
          <span className="label-text">Email</span>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
            required
          />
        </label>
      </fieldset>
      <div className="flex justify-end">
        <button type="submit" className="btn preset-filled-primary-700-300" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}

function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSaved(false)
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match')
      return
    }
    setSubmitting(true)
    try {
      await api.changePassword({ current_password: currentPassword, new_password: newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="card preset-filled-surface-100-900 space-y-4 p-6" onSubmit={handleSubmit}>
      <h2 className="h4">Change password</h2>
      {error && <p className="text-error-500 text-sm">{error}</p>}
      {saved && <p className="text-success-500 text-sm">Password changed.</p>}
      <fieldset className="fieldset grid gap-4 sm:grid-cols-2">
        <label className="label min-w-0 sm:col-span-2">
          <span className="label-text">Current password</span>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setCurrentPassword(event.target.value)}
            required
          />
        </label>
        <label className="label min-w-0">
          <span className="label-text">New password</span>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setNewPassword(event.target.value)}
            required
          />
        </label>
        <label className="label min-w-0">
          <span className="label-text">Confirm new password</span>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setConfirmPassword(event.target.value)}
            required
          />
        </label>
      </fieldset>
      <div className="flex justify-end">
        <button type="submit" className="btn preset-filled-primary-700-300" disabled={submitting}>
          {submitting ? 'Saving…' : 'Change password'}
        </button>
      </div>
    </form>
  )
}

function TerminalPreview() {
  const { terminalFontSize, terminalFontFamily, terminalThemeId, terminalCursorStyle } = usePreferences()
  const theme = getTerminalTheme(terminalThemeId)

  const cursorClassName =
    terminalCursorStyle === 'underline'
      ? 'inline-block w-2 border-b-2'
      : terminalCursorStyle === 'bar'
        ? 'inline-block w-px border-l-2'
        : 'inline-block w-2'

  return (
    <pre
      className="overflow-x-auto rounded-md p-3 leading-relaxed"
      style={{
        backgroundColor: theme.background,
        color: theme.foreground,
        fontFamily: terminalFontFamily,
        fontSize: terminalFontSize,
      }}
    >
      <span style={{ color: theme.green }}>user@webmius</span>
      <span style={{ color: theme.foreground }}>:</span>
      <span style={{ color: theme.blue }}>~/projects</span>
      <span style={{ color: theme.foreground }}>$ </span>
      <span>ls -la </span>
      <span style={{ color: theme.yellow }}>--color</span>
      <span
        className={cursorClassName}
        style={{ backgroundColor: terminalCursorStyle === 'block' ? theme.cursor : undefined, borderColor: theme.cursor }}
      >
        {' '}
      </span>
      {'\n'}
      <span style={{ color: theme.red }}>error:</span>
      <span> permission denied </span>
      <span style={{ color: theme.cyan }}>(exit 1)</span>
    </pre>
  )
}

function PreferencesSection() {
  const {
    terminalFontSize,
    setTerminalFontSize,
    terminalThemeId,
    setTerminalThemeId,
    terminalFontFamily,
    setTerminalFontFamily,
    terminalCursorStyle,
    setTerminalCursorStyle,
  } = usePreferences()

  return (
    <div className="card preset-filled-surface-100-900 space-y-4 p-6">
      <h2 className="h4">Preferences</h2>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-medium">Theme</p>
          <p className="text-sm opacity-60">Switch between light and dark mode.</p>
        </div>
        <ThemeToggle />
      </div>

      <div className="border-surface-500/30 space-y-4 border-t pt-4">
        <p className="font-medium">Terminal</p>

        <TerminalPreview />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="label min-w-0">
            <span className="label-text">Color theme</span>
            <select
              className="select"
              value={terminalThemeId}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => setTerminalThemeId(event.target.value)}
            >
              {TERMINAL_THEMES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="label min-w-0">
            <span className="label-text">Font family</span>
            <select
              className="select"
              value={terminalFontFamily}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => setTerminalFontFamily(event.target.value)}
            >
              {TERMINAL_FONT_FAMILIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className="label min-w-0">
            <span className="label-text">Font size</span>
            <input
              className="input"
              type="number"
              min={MIN_FONT_SIZE}
              max={MAX_FONT_SIZE}
              value={terminalFontSize}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setTerminalFontSize(Number(event.target.value))}
            />
          </label>
          <label className="label min-w-0">
            <span className="label-text">Cursor style</span>
            <select
              className="select"
              value={terminalCursorStyle}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                setTerminalCursorStyle(event.target.value as typeof terminalCursorStyle)
              }
            >
              {TERMINAL_CURSOR_STYLES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="text-xs opacity-60">
          Applies to terminal tabs opened after this change. Fonts other than "System monospace" only render if
          installed on your device — otherwise your browser falls back to its default monospace font.
        </p>
      </div>
    </div>
  )
}

function DangerZoneSection() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!window.confirm('Delete your account? This permanently removes your connections and history.')) {
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await api.deleteMe(password)
      await logout()
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSubmitting(false)
    }
  }

  return (
    <form className="card preset-filled-surface-100-900 space-y-4 p-6" onSubmit={handleSubmit}>
      <h2 className="h4 text-error-500">Danger zone</h2>
      <p className="text-sm opacity-60">
        Deleting your account permanently removes your connections and connection history. This cannot be undone.
      </p>
      {error && <p className="text-error-500 text-sm">{error}</p>}
      <label className="label min-w-0 max-w-xs">
        <span className="label-text">Confirm your password</span>
        <input
          className="input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
          required
        />
      </label>
      <div className="flex justify-end">
        <button type="submit" className="btn preset-tonal-error" disabled={submitting}>
          {submitting ? 'Deleting…' : 'Delete account'}
        </button>
      </div>
    </form>
  )
}

function AdminSettingsSection() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [timeoutInput, setTimeoutInput] = useState('')

  useEffect(() => {
    api
      .getAppSettings()
      .then((result) => {
        setSettings(result)
        setTimeoutInput(result.session_timeout_minutes ? String(result.session_timeout_minutes) : '')
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!settings) return
    setError(null)
    setSaved(false)
    setSubmitting(true)
    try {
      const updated = await api.updateAppSettings({
        registration_enabled: settings.registration_enabled,
        session_timeout_minutes: timeoutInput ? Number(timeoutInput) : null,
      })
      setSettings(updated)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="card preset-filled-surface-100-900 p-6">
        <p className="opacity-60">Loading admin settings…</p>
      </div>
    )
  }

  if (loadError || !settings) {
    return (
      <div className="card preset-filled-surface-100-900 p-6">
        <p className="text-error-500 text-sm">{loadError ?? 'Could not load admin settings'}</p>
      </div>
    )
  }

  return (
    <form className="card preset-filled-surface-100-900 space-y-4 p-6" onSubmit={handleSubmit}>
      <h2 className="h4">Admin settings</h2>
      {error && <p className="text-error-500 text-sm">{error}</p>}
      {saved && <p className="text-success-500 text-sm">Saved.</p>}
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          className="checkbox"
          checked={settings.registration_enabled}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            setSettings({ ...settings, registration_enabled: event.target.checked })
          }
        />
        <span>Allow new users to register</span>
      </label>
      <label className="label min-w-0 max-w-xs">
        <span className="label-text">
          Session idle timeout (minutes) <span className="opacity-60">(blank = no timeout)</span>
        </span>
        <input
          className="input"
          type="number"
          min={1}
          value={timeoutInput}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setTimeoutInput(event.target.value)}
        />
      </label>
      <div className="flex justify-end">
        <button type="submit" className="btn preset-filled-primary-700-300" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}

function Settings() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen">
      <AppBar>
        <AppBar.Toolbar className="grid-cols-1 gap-2 sm:grid-cols-[auto_1fr_auto]">
          <AppBar.Lead>
            <p className="h4">Settings</p>
          </AppBar.Lead>
          <AppBar.Headline />
          <AppBar.Trail className="flex-wrap items-center justify-end gap-2">
            <Link to="/dashboard" className="btn btn-sm preset-tonal">
              Back to dashboard
            </Link>
            <ThemeToggle />
          </AppBar.Trail>
        </AppBar.Toolbar>
      </AppBar>

      <main className="mx-auto max-w-4xl space-y-4 p-6">
        <AccountSection />
        <PasswordSection />
        <PreferencesSection />
        <DangerZoneSection />
        {user?.role === 'admin' && <AdminSettingsSection />}
      </main>
    </div>
  )
}

export default Settings

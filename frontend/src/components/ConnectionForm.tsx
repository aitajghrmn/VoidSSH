import { useState, type ChangeEvent, type FormEvent } from 'react'
import type { AuthType, ConnectionPayload, SSHConnection } from '../types'

interface FormState {
  name: string
  host: string
  port: string
  username: string
  authType: AuthType
  password: string
  privateKey: string
  privateKeyPassphrase: string
  tags: string
}

const emptyForm: FormState = {
  name: '',
  host: '',
  port: '22',
  username: '',
  authType: 'password',
  password: '',
  privateKey: '',
  privateKeyPassphrase: '',
  tags: '',
}

function toFormState(connection?: SSHConnection): FormState {
  if (!connection) return emptyForm
  return {
    name: connection.name,
    host: connection.host,
    port: String(connection.port),
    username: connection.username,
    authType: connection.auth_type,
    password: '',
    privateKey: '',
    privateKeyPassphrase: '',
    tags: connection.tags.join(', '),
  }
}

interface ConnectionFormProps {
  initialValues?: SSHConnection
  onSubmit: (payload: ConnectionPayload) => Promise<void>
  onCancel: () => void
  isEditing?: boolean
}

function ConnectionForm({ initialValues, onSubmit, onCancel, isEditing = false }: ConnectionFormProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(initialValues))
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target
    setForm({ ...form, [name]: name === 'port' ? value.replace(/\D/g, '') : value })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const payload: ConnectionPayload = {
        name: form.name,
        host: form.host,
        username: form.username,
        port: Number(form.port) || 22,
        auth_type: form.authType,
        tags: form.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      }
      if (form.authType === 'password') {
        if (form.password) payload.password = form.password
      } else {
        if (form.privateKey) payload.private_key = form.privateKey
        if (form.privateKeyPassphrase) payload.private_key_passphrase = form.privateKeyPassphrase
      }
      await onSubmit(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="card preset-filled-surface-100-900 space-y-4 p-6" onSubmit={handleSubmit}>
      <h3 className="h4">{isEditing ? 'Edit connection' : 'Add connection'}</h3>

      {error && <p className="text-error-500 text-sm">{error}</p>}

      <fieldset className="fieldset grid gap-4 sm:grid-cols-2">
        <label className="label min-w-0 sm:col-span-2">
          <span className="label-text">Name</span>
          <input
            className="input"
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
          />
        </label>
        <label className="label min-w-0">
          <span className="label-text">Host</span>
          <input
            className="input"
            type="text"
            name="host"
            value={form.host}
            onChange={handleChange}
            required
          />
        </label>
        <label className="label min-w-0">
          <span className="label-text">Port</span>
          <input
            className="input"
            type="text"
            inputMode="numeric"
            name="port"
            value={form.port}
            onChange={handleChange}
            required
          />
        </label>
        <label className="label min-w-0">
          <span className="label-text">Username</span>
          <input
            className="input"
            type="text"
            name="username"
            value={form.username}
            onChange={handleChange}
            required
          />
        </label>
        <label className="label min-w-0 sm:col-span-2">
          <span className="label-text">
            Tags <span className="opacity-60">(comma-separated, e.g. "prod, web")</span>
          </span>
          <input
            className="input"
            type="text"
            name="tags"
            value={form.tags}
            onChange={handleChange}
          />
        </label>
        <label className="label min-w-0">
          <span className="label-text">Authentication</span>
          <select className="select" name="authType" value={form.authType} onChange={handleChange}>
            <option value="password">Password</option>
            <option value="key">SSH key</option>
          </select>
        </label>

        {form.authType === 'password' && (
          <label className="label min-w-0">
            <span className="label-text">
              Password{isEditing && <span className="opacity-60"> (leave blank to keep unchanged)</span>}
            </span>
            <input
              className="input"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required={!isEditing}
            />
          </label>
        )}

        {form.authType === 'key' && (
          <>
            <label className="label min-w-0 sm:col-span-2">
              <span className="label-text">
                Private key{isEditing && <span className="opacity-60"> (leave blank to keep unchanged)</span>}
              </span>
              <textarea
                className="textarea font-mono text-xs"
                name="privateKey"
                rows={6}
                placeholder={'-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----'}
                value={form.privateKey}
                onChange={handleChange}
                required={!isEditing}
              />
            </label>
            <label className="label min-w-0 sm:col-span-2">
              <span className="label-text">
                Key passphrase <span className="opacity-60">(only if the key is encrypted)</span>
              </span>
              <input
                className="input"
                type="password"
                name="privateKeyPassphrase"
                value={form.privateKeyPassphrase}
                onChange={handleChange}
              />
            </label>
          </>
        )}
      </fieldset>

      <div className="flex justify-end gap-2">
        <button type="button" className="btn preset-tonal" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn preset-filled-primary-700-300" disabled={submitting}>
          {submitting ? 'Saving…' : isEditing ? 'Save changes' : 'Add connection'}
        </button>
      </div>
    </form>
  )
}

export default ConnectionForm

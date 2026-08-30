import type {
  AdminUser,
  AppSettings,
  ChangePasswordPayload,
  ConnectionLogEntry,
  ConnectionPayload,
  LoginPayload,
  RegisterPayload,
  SSHConnection,
  UpdateProfilePayload,
  User,
} from '../types'

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

interface ApiErrorBody {
  error?: string
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', undefined])

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    // Only set on requests with a body — sending it on bodyless GET/POST
    // requests (e.g. me(), logout()) adds a header the CORS "simple request"
    // allowlist doesn't cover, forcing an OPTIONS preflight round-trip for
    // no reason.
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers as Record<string, string> | undefined),
  }

  if (!SAFE_METHODS.has(options.method?.toUpperCase())) {
    const csrfToken = readCookie('csrf_token')
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken
  }

  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers,
    ...options,
  })

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const body = isJson ? await response.json() : null

  if (!response.ok) {
    throw new Error((body as ApiErrorBody | null)?.error || `Request failed with status ${response.status}`)
  }

  return body as T
}

export const api = {
  health: () => request<{ status: string }>('/health'),
  register: (data: RegisterPayload) =>
    request<User>('/api/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: LoginPayload) =>
    request<User>('/api/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request<null>('/api/logout', { method: 'POST' }),
  me: () => request<User>('/api/me'),
  updateMe: (data: UpdateProfilePayload) =>
    request<User>('/api/me', { method: 'PATCH', body: JSON.stringify(data) }),
  changePassword: (data: ChangePasswordPayload) =>
    request<null>('/api/me/password', { method: 'POST', body: JSON.stringify(data) }),
  deleteMe: (password: string) =>
    request<null>('/api/me', { method: 'DELETE', body: JSON.stringify({ password }) }),
  requestPasswordReset: (email: string) =>
    request<{ message: string }>('/api/password-reset/request', { method: 'POST', body: JSON.stringify({ email }) }),
  confirmPasswordReset: (token: string, newPassword: string) =>
    request<null>('/api/password-reset/confirm', {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPassword }),
    }),
  listConnections: () => request<SSHConnection[]>('/api/connections'),
  createConnection: (data: ConnectionPayload) =>
    request<SSHConnection>('/api/connections', { method: 'POST', body: JSON.stringify(data) }),
  updateConnection: (id: number, data: Partial<ConnectionPayload>) =>
    request<SSHConnection>(`/api/connections/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteConnection: (id: number) => request<null>(`/api/connections/${id}`, { method: 'DELETE' }),
  listConnectionLogs: () => request<ConnectionLogEntry[]>('/api/connection-logs'),
  getConnectionLogRecording: (id: number) =>
    request<{ recording: string | null }>(`/api/connection-logs/${id}/recording`),
  listAdminUsers: () => request<AdminUser[]>('/api/admin/users'),
  deleteAdminUser: (id: number) => request<null>(`/api/admin/users/${id}`, { method: 'DELETE' }),
  getAppSettings: () => request<AppSettings>('/api/admin/settings'),
  updateAppSettings: (data: Partial<AppSettings>) =>
    request<AppSettings>('/api/admin/settings', { method: 'PATCH', body: JSON.stringify(data) }),
}

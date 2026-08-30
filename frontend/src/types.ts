export type Role = 'user' | 'admin'

export interface User {
  id: number
  username: string
  email: string
  role: Role
}

export type AuthType = 'password' | 'key'

export interface SSHConnection {
  id: number
  name: string
  host: string
  port: number
  username: string
  auth_type: AuthType
  tags: string[]
  created_at: string | null
}

export interface RegisterPayload {
  username: string
  email: string
  password: string
}

export interface LoginPayload {
  username: string
  password: string
}

export interface ConnectionPayload {
  name: string
  host: string
  port: number
  username: string
  password?: string
  private_key?: string
  private_key_passphrase?: string
  auth_type?: AuthType
  tags?: string[]
}

export interface SSHOutputEvent {
  data: string
}

export interface SSHErrorEvent {
  message: string
}

export type ConnectionLogStatus = 'success' | 'failed'

export interface ConnectionLogEntry {
  id: number
  connection_id: number | null
  connection_name: string
  host: string
  port: number
  username: string
  status: ConnectionLogStatus
  error_message: string | null
  has_recording: boolean
  started_at: string | null
  ended_at: string | null
}

export interface AdminUser {
  id: number
  username: string
  email: string
  role: Role
  connection_count: number
  created_at: string | null
}

export interface UpdateProfilePayload {
  username?: string
  email?: string
}

export interface ChangePasswordPayload {
  current_password: string
  new_password: string
}

export interface AppSettings {
  registration_enabled: boolean
  session_timeout_minutes: number | null
}

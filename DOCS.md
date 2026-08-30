---
title: Webmius – Web-based SSH Management System
date: 2026-08-12
---

# Webmius – Web-based SSH Management System

## Technical Documentation (MVP)

### 1\. Project Overview

Webmius is a self-hostable web application that allows users to store, manage, and connect to SSH servers from a browser interface. The system is inspired by tools like Termius but focuses on a simplified MVP version suitable for basic remote server management.

The application enables users to:

* Save SSH connection credentials
* Organize servers
* Connect to servers via a web-based terminal
* Execute commands remotely

* * *

### 2\. Objectives

* Provide a centralized SSH connection manager
* Enable browser-based remote server access
* Ensure secure storage of credentials
* Build a lightweight and self-hostable system

* * *

### 3. Scope (MVP Features)

#### Core Features

* User authentication (login/register)
* Add / edit / delete SSH connections
* Store host, port, username, authentication method
* Web-based terminal (basic command execution)
* Connection list dashboard

#### Optional (If time permits)

* SSH key authentication support
* Tagging or grouping servers
* Connection history (logs)

* * *

### 4\. System Architecture

The system follows a client-server architecture:

* **Frontend:** React (TypeScript, built with Vite)
* **Backend:** Python Flask
* **Database:** PostgreSQL
* **Communication:** REST API + WebSocket (for terminal)
* **Deployment unit:** Docker/Podman Compose (`db` + `backend` + `frontend`, plus an opt-in `proxy` service for TLS — see §10)

* * *

### 5\. Technology Stack

| Layer        | Technology                                     |
| ------------ | ----------------------------------------------- |
| Frontend     | React + TypeScript (Vite, Tailwind, Skeleton)  |
| Backend      | Flask (Python)                                 |
| Database     | PostgreSQL                                     |
| SSH Handling | Paramiko (Python)                              |
| Real-time    | WebSockets (Flask-SocketIO + Socket.IO client) |

* * *

### 6\. Database Design

#### Users Table

* id
* username
* email
* password\_hash
* role ("user" or "admin"; the first account ever registered on an instance becomes "admin", everyone after is "user")

#### SSH\_Connections Table

* id
* user\_id (FK)
* name
* host
* port
* username
* auth_type (password/key)
* encrypted\_password (optional, used when auth_type is "password")
* encrypted\_private\_key (optional, used when auth_type is "key")
* encrypted\_private\_key\_passphrase (optional, only if the stored key is itself passphrase-protected)
* tags (optional, comma-separated, normalized to lowercase/deduped on write)

#### Connection\_Logs Table

* id
* user\_id (FK)
* connection\_id (FK, nullable, set null if the connection is later deleted)
* connection\_name, host, port, username — a snapshot of the connection's identity at the time of the attempt, so history stays meaningful even after the connection is edited or deleted
* status ("success" or "failed")
* error\_message (nullable, populated on failure)
* recording (nullable; the session's raw terminal output, bounded to 500,000 characters — see §7)
* started\_at, ended\_at (ended\_at is null while a session is still open)

* * *

### 7. API Design (Simplified)

#### Authentication

* POST /api/register
* POST /api/login
* POST /api/logout
* GET /api/me — current session's user, used by the frontend to restore auth state on load

#### SSH Connections

* GET /api/connections — accepts an optional `?tag=` query param to filter by tag
* POST /api/connections
* PUT /api/connections/{id}
* DELETE /api/connections/{id}

`auth_type` is `"password"` or `"key"`. Password connections take a `password` field; key connections take a `private_key` (PEM/OpenSSH format) and an optional `private_key_passphrase` if the key itself is encrypted. The key is parsed and validated server-side at save time (unrecognized formats or a missing/wrong passphrase are rejected with a 400), not just at connect time. As with `password`, omitting `private_key`/`private_key_passphrase` on an update leaves the stored value unchanged.

`tags` is an optional array of strings; unlike `password`/`private_key`, it's a full replace on every create/update (normalized to lowercase, trimmed, deduped) — there's no "leave unchanged" semantics since tags aren't secret and the form always round-trips the current value.

All `/api/*` mutating requests (state-changing methods) additionally require an `X-CSRF-Token` header echoing the `csrf_token` cookie (double-submit pattern) — see §8.

#### Connection History

* GET /api/connection-logs — the current user's own connection attempts (most recent 100), each SSH session start/end and any password/key connections is logged automatically, not user-initiated
* GET /api/connection-logs/{id}/recording — the session's captured terminal transcript (`{"recording": string | null}`), fetched on demand rather than embedded in the list response

#### Admin (role: "admin" only)

* GET /api/admin/users — every user's id/username/email/role/connection count/created_at
* DELETE /api/admin/users/{id} — deletes a user and cascades their connections, logs, and login sessions; blocked for self-deletion and for deleting the last remaining admin

#### SSH Session

* WS /ws/ssh-session (Flask-SocketIO namespace, authenticated via the existing session cookie)
    
    * `ssh_connect` / `ssh_input` / `ssh_resize` — client → server
    * `ssh_connected` / `ssh_output` / `ssh_error` / `ssh_closed` — server → client

The namespace supports multiple concurrent sessions per user: each is an independent Socket.IO connection (its own `sid`), keyed independently server-side, so the frontend can open several tabs/panes at once without any per-connection protocol changes — see §9. Every session's raw output is captured server-side into `connection_logs.recording` (bounded to 500,000 characters, then truncated with a notice) as it streams, and persisted when the session ends.

* * *

### 8\. Security Considerations

* Passwords hashed using bcrypt
* SSH credentials encrypted at rest (Fernet, key sourced from env) and never echoed back in API responses
* Session cookies are `HttpOnly` + `SameSite=Lax`, and `Secure` whenever served over HTTPS
* CSRF protection on all state-changing `/api/*` requests via a double-submit cookie/header pair
* Rate limiting on `/api/register` and `/api/login` (10/min per IP)
* HTTPS available via an opt-in reverse-proxy ("prod" Compose profile, Caddy) that terminates TLS in front of the dev services — see §10
* Session-based authentication (JWT optional, not implemented in the MVP)

* * *

### 9\. User Flow

1. User registers/logs in
2. User adds SSH server details
3. User selects a server from dashboard
4. Web terminal opens in a new tab within the terminal workspace (`/terminal`); a "+ New" picker lets the user open additional servers as further tabs without leaving the workspace, each an independent concurrent session
5. Commands are executed remotely via backend
6. The user can review past sessions (including a captured terminal transcript for successful ones) from the connection history page

* * *

### 10\. Deployment

* Self-hosted on VPS or local server, container-first: `docker compose up` / `podman compose up` brings up `db` (PostgreSQL), `backend` (Flask), and `frontend` (Vite dev server) with no local Python/Node install required
* An opt-in `proxy` service (Caddy, `--profile prod`) terminates real TLS in front of the dev services, for exercising the `Secure`-cookie / HTTPS path locally or on a real host
* See `README.md` for the exact commands

* * *

### 11. Limitations (MVP)

* Session recordings are plain terminal transcripts (ANSI control codes stripped for display), not timed asciinema-style playback — there's no "watch it happen in real time" replay, just the captured text
* Limited security compared to enterprise tools (no secrets vaulting, no SSO)
* No multi-user collaboration: role-based access control is minimal (a global "user"/"admin" distinction — admins can list and remove accounts) rather than shared connections, teams, or per-resource permissions

* * *

### 12\. Future Improvements

* Per-resource / team-based access control (shared connections, not just a global admin/user split)
* Timed, replayable session recordings (asciinema-style), rather than a plain transcript

Terminal emulation via xterm.js, SSH key-based authentication, tagging/grouping of servers, connection history, basic role-based access control, a verified mobile-responsive UI, terminal multiplexing (multiple concurrent tabbed sessions), and session recording (transcript capture) all shipped as part of the MVP (§5, §7) rather than remaining stretch goals. Multiplexing and session recording were explicitly called out of scope earlier in this project's life (see `ROADMAP.md`'s "Out of Scope for MVP" section) — that boundary was deliberately lifted by request partway through the build, not silently ignored; `ROADMAP.md` records when and why.

* * *

### 13\. Conclusion

Webmius provides a simple and practical solution for managing SSH connections via a web interface. The MVP focuses on essential functionality while leaving room for future scalability and improvements.
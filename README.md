<div align="center">

  <img src="https://img.shields.io/badge/status-active-17e08a?style=flat-square" alt="status" />
  <img src="https://img.shields.io/badge/license-see%20LICENSE-lightgrey?style=flat-square" alt="license" />
  <img src="https://img.shields.io/badge/frontend-React%20%2B%20TypeScript-3178c6?style=flat-square" alt="frontend" />
  <img src="https://img.shields.io/badge/backend-Python%20%2B%20Flask-3776ab?style=flat-square" alt="backend" />
  <img src="https://img.shields.io/badge/database-PostgreSQL-336791?style=flat-square" alt="database" />

  <h1>🟢 VoidSSH</h1>
  <p><strong>A self-hostable, web-based SSH connection manager.</strong></p>
  <p>Manage your servers, open terminals, and track connection history — all from the browser.</p>

</div>

---

## Table of Contents

- [Overview](#overview)
- [Why VoidSSH](#why-voidssh)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Quick Start (Docker / Podman)](#quick-start-docker--podman)
  - [Manual Development Setup](#manual-development-setup)
- [Environment Variables](#environment-variables)
- [Security](#security)
- [Project Structure](#project-structure)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**VoidSSH** replaces the traditional terminal-and-notes-file workflow for managing SSH servers with a single, centralized web application. Instead of remembering hostnames, usernames, and keys scattered across your local machine, VoidSSH gives you a secure dashboard to store connections, launch a full terminal session in your browser, and review a history of every connection made — all served from your own infrastructure.

It is built container-first, so it can be deployed on a VPS, a home server, or an internal/private network in minutes.

## Why VoidSSH

Managing multiple SSH servers the traditional way tends to look like this:

```
open terminal → ssh user@server → remember credentials/keys → manage another server → repeat
```

This doesn't scale. Credentials get scattered, there's no shared visibility into who connected where and when, and switching between servers means juggling terminal tabs and shell history.

VoidSSH turns that workflow into a web application:

```
open browser → log in → pick a server → connect → done
```

Encrypted credential storage, connection history, and terminal access all live in one place, accessible from any device with a browser.

## Key Features

- 🔐 **User authentication** — secure, session-based login and registration
- 🖥️ **SSH connection management** — add, edit, tag, and organize server connections
- 🌐 **Browser-based terminal** — full interactive terminal sessions over WebSocket, no local SSH client required
- 🔑 **Flexible authentication** — connect using either password or SSH key
- 🗂️ **Tags & filtering** — organize connections by environment, project, or team
- 📜 **Connection history** — a full audit log of every connection attempt, with duration and status
- 🎥 **Session recording** — terminal sessions can be recorded and replayed as plain-text transcripts
- 👥 **Role-based access** — basic admin/user roles, with an admin panel for user management
- 🔀 **Multiple concurrent sessions** — open and switch between several terminal tabs at once
- 🎨 **Customizable terminal** — choose your terminal color theme, font, font size, and cursor style
- 📱 **Responsive design** — fully usable on mobile and tablet, not just desktop

## Tech Stack

| Layer          | Technology                                                                 |
| -------------- | --------------------------------------------------------------------------- |
| Frontend       | React, TypeScript, Vite, Tailwind CSS, Skeleton UI, xterm.js                |
| Backend        | Python, Flask, Paramiko (SSH protocol), WebSocket (real-time terminal I/O)  |
| Database       | PostgreSQL                                                                  |
| Reverse Proxy  | Caddy (automatic HTTPS)                                                     |
| Deployment     | Docker / Podman, `docker-compose`                                           |

## Architecture

VoidSSH follows a straightforward client-server architecture:

```
┌────────────────────┐        REST API (HTTPS/JSON)        ┌────────────────────┐
│                     │ ───────────────────────────────────▶│                    │
│      Frontend       │                                      │      Backend       │
│  React + TypeScript │        WebSocket (real-time)         │   Python + Flask   │
│   Vite + Tailwind   │ ◀───────────────────────────────────▶│      Paramiko      │
│                     │                                      │                    │
└────────────────────┘                                      └─────────┬──────────┘
                                                                       │
                                                     ┌─────────────────┴─────────────────┐
                                                     ▼                                    ▼
                                          ┌────────────────────┐              ┌────────────────────┐
                                          │     PostgreSQL      │              │    SSH Servers      │
                                          │    Data Storage     │              │  (your own hosts)   │
                                          └────────────────────┘              └────────────────────┘
```

**How a terminal session works, end to end:**

1. The user opens a terminal tab in the browser.
2. Keystrokes are streamed to the Flask backend over a WebSocket connection.
3. The backend forwards input to the target server through Paramiko (the SSH client library).
4. The remote server executes the command and returns output.
5. Output travels back through the same WebSocket connection and renders live in the browser terminal.

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) or [Podman](https://podman.io/) with Compose support
- Git

### Quick Start (Docker / Podman)

```bash
# Clone the repository
git clone https://github.com/aitajghrmn/VoidSSH.git
cd voidssh

# Configure environment variables
cp .env.example .env
# then edit .env with your own secrets (see Environment Variables below)

# Start everything (Docker)
docker compose up -d

# ...or with Podman
podman compose up -d
```

Once running, VoidSSH will be available at the address configured in your `Caddyfile` / `docker-compose.yml` (`http://localhost` by default in local setups).

### Manual Development Setup

<details>
<summary>Backend</summary>

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
flask run
```

</details>

<details>
<summary>Frontend</summary>

```bash
cd frontend
pnpm install
pnpm dev
```

</details>

## Environment Variables

Configuration is managed through a `.env` file at the project root. At minimum, you'll want to set:

| Variable                 | Description                                             |
| ------------------------- | -------------------------------------------------------- |
| `DATABASE_URL`            | PostgreSQL connection string                            |
| `SECRET_KEY`               | Flask session secret                                     |
| `FERNET_KEY`               | Encryption key used to secure stored SSH credentials     |
| `VITE_API_URL`             | Base URL the frontend uses to reach the backend API      |

> ⚠️ Never commit your `.env` file. Use `.env.example` as a reference and keep real secrets out of version control.

## Security

Because VoidSSH stores and uses SSH credentials on the user's behalf, security is treated as a first-class concern rather than an afterthought:

- **bcrypt** password hashing for user accounts
- **Fernet (symmetric) encryption** for stored SSH credentials at rest
- Credentials are **never returned** through any API response
- **HttpOnly + SameSite** session cookies, served securely over HTTPS
- **CSRF protection** on state-changing requests
- **Rate limiting** on login and registration endpoints
- Optional automatic **HTTPS via Caddy**
- Session-based authentication throughout

## Project Structure

```
voidssh/
├── backend/          # Flask API, Paramiko SSH handling, WebSocket server
├── frontend/          # React + TypeScript client (Vite, Tailwind, Skeleton UI)
├── deploy/            # Caddyfile and deployment configuration
├── .github/           # CI/CD workflows
├── docker-compose.yml
├── DOCS.md
├── ROADMAP.md
└── README.md
```

See [`DOCS.md`](./DOCS.md) for in-depth documentation and [`ROADMAP.md`](./ROADMAP.md) for planned work.

## Roadmap

Planned improvements include expanded role-based permissions, SFTP file transfer support, audit-log export, and additional terminal customization options. See [`ROADMAP.md`](./ROADMAP.md) for the full, up-to-date list.

## Contributing

Contributions, issues, and feature requests are welcome. Feel free to open an issue to discuss what you'd like to change before submitting a pull request.

## License

This project is licensed under the terms of the [`LICENSE`](./LICENSE) file included in this repository.

---

<div align="center">
  <sub>Built with ❤️ to make managing SSH servers less painful.</sub>
</div>

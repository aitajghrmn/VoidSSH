import codecs
import socket
import threading
from datetime import datetime, timezone

import paramiko
from flask import current_app, request
from flask_socketio import Namespace, disconnect, emit

from ..extensions import db, socketio
from ..models import ConnectionLog, SSHConnection
from ..security.auth import get_current_user
from ..security.crypto import decrypt_value
from ..security.ssh_keys import parse_private_key

NAMESPACE = "/ws/ssh-session"

# Bounds how much of a session's output we keep as a recording, so a
# long-running (or noisy) session can't grow a log row without limit.
MAX_RECORDING_CHARS = 500_000
_TRUNCATION_NOTICE = "\n[recording truncated — session continued]\n"

_sessions = {}
_sessions_lock = threading.Lock()


class _SSHSession:
    def __init__(self, client, channel, log_id=None):
        self.client = client
        self.channel = channel
        self.log_id = log_id


def _record_attempt(user, connection, status, error_message=None):
    now = datetime.now(timezone.utc)
    log = ConnectionLog(
        user_id=user.id,
        connection_id=connection.id,
        connection_name=connection.name,
        host=connection.host,
        port=connection.port,
        username=connection.username,
        status=status,
        error_message=error_message,
        started_at=now,
        ended_at=now if status == "failed" else None,
    )
    db.session.add(log)
    db.session.commit()
    return log.id


def _finish_attempt(app, log_id, recording):
    if log_id is None:
        return
    with app.app_context():
        log = db.session.get(ConnectionLog, log_id)
        if log is not None and log.ended_at is None:
            log.ended_at = datetime.now(timezone.utc)
            log.recording = recording or None
            db.session.commit()


def _set_session(sid, session):
    with _sessions_lock:
        _sessions[sid] = session


def _get_session(sid):
    with _sessions_lock:
        return _sessions.get(sid)


def _pop_session(sid):
    with _sessions_lock:
        return _sessions.pop(sid, None)


def _close_session(session):
    try:
        session.channel.close()
    except Exception:
        pass
    try:
        session.client.close()
    except Exception:
        pass


def _stream_output(sid, channel, app, log_id):
    recording_chunks = []
    recording_len = 0
    truncated = False
    # A multi-byte UTF-8 character (eg. powerline glyphs/box-drawing chars used
    # in many shell prompts) can straddle a 4096-byte recv() boundary. Decoding
    # each chunk independently would mangle it into replacement characters, so
    # an incremental decoder carries partial sequences over to the next chunk.
    decoder = codecs.getincrementaldecoder("utf-8")(errors="replace")

    while True:
        try:
            data = channel.recv(4096)
        except OSError:
            break
        if not data:
            break
        text = decoder.decode(data)
        if not text:
            continue

        if not truncated:
            if recording_len + len(text) > MAX_RECORDING_CHARS:
                remaining = MAX_RECORDING_CHARS - recording_len
                if remaining > 0:
                    recording_chunks.append(text[:remaining])
                recording_chunks.append(_TRUNCATION_NOTICE)
                truncated = True
            else:
                recording_chunks.append(text)
                recording_len += len(text)

        socketio.emit("ssh_output", {"data": text}, to=sid, namespace=NAMESPACE)

    socketio.emit("ssh_closed", {}, to=sid, namespace=NAMESPACE)
    session = _pop_session(sid)
    if session is not None:
        _close_session(session)
    _finish_attempt(app, log_id, "".join(recording_chunks))


class SSHSessionNamespace(Namespace):
    def on_connect(self):
        if get_current_user() is None:
            raise ConnectionRefusedError("authentication required")

    def on_disconnect(self, reason=None):
        session = _pop_session(request.sid)
        if session is not None:
            _close_session(session)

    def on_ssh_connect(self, payload):
        sid = request.sid
        user = get_current_user()
        if user is None:
            emit("ssh_error", {"message": "authentication required"})
            disconnect()
            return

        if _get_session(sid) is not None:
            emit("ssh_error", {"message": "a session is already active"})
            return

        payload = payload or {}
        connection = SSHConnection.query.filter_by(
            id=payload.get("connection_id"), user_id=user.id
        ).first()
        if connection is None:
            emit("ssh_error", {"message": "connection not found"})
            return

        if connection.auth_type == "password":
            if not connection.encrypted_password:
                _record_attempt(user, connection, "failed", "no password stored for this connection")
                emit("ssh_error", {"message": "no password stored for this connection"})
                return
            auth_kwargs = {"password": decrypt_value(connection.encrypted_password)}
        elif connection.auth_type == "key":
            if not connection.encrypted_private_key:
                _record_attempt(user, connection, "failed", "no private key stored for this connection")
                emit("ssh_error", {"message": "no private key stored for this connection"})
                return
            try:
                passphrase = (
                    decrypt_value(connection.encrypted_private_key_passphrase)
                    if connection.encrypted_private_key_passphrase
                    else None
                )
                pkey = parse_private_key(decrypt_value(connection.encrypted_private_key), passphrase)
            except (ValueError, paramiko.PasswordRequiredException) as exc:
                message = f"stored private key is invalid: {exc}"
                _record_attempt(user, connection, "failed", message)
                emit("ssh_error", {"message": message})
                return
            auth_kwargs = {"pkey": pkey}
        else:
            _record_attempt(user, connection, "failed", "unsupported auth_type")
            emit("ssh_error", {"message": "unsupported auth_type"})
            return

        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        try:
            client.connect(
                hostname=connection.host,
                port=connection.port,
                username=connection.username,
                timeout=10,
                allow_agent=False,
                look_for_keys=False,
                **auth_kwargs,
            )
        except paramiko.AuthenticationException:
            _record_attempt(user, connection, "failed", "SSH authentication failed")
            emit("ssh_error", {"message": "SSH authentication failed"})
            return
        except (paramiko.SSHException, OSError) as exc:
            message = f"unable to reach host: {exc}"
            _record_attempt(user, connection, "failed", message)
            emit("ssh_error", {"message": message})
            return

        # Paramiko doesn't disable Nagle's algorithm on the underlying socket.
        # For an interactive shell that means every small packet (eg. a
        # single keystroke's echo) can sit buffered for up to ~40ms waiting
        # to coalesce with more data before it's sent, which reads as the
        # whole session being laggy. Disabling it trades a little bandwidth
        # efficiency (irrelevant here) for correct interactive latency.
        sock = client.get_transport().sock
        sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)

        try:
            cols = int(payload.get("cols", 80))
            rows = int(payload.get("rows", 24))
        except (TypeError, ValueError):
            cols, rows = 80, 24

        log_id = _record_attempt(user, connection, "success")
        # Allocate the pty at the frontend's real size up front. If the shell
        # instead starts at the 80x24 default and gets resized a moment later,
        # the remote line editor's cursor math for the prompt it already drew
        # (at the wrong width) goes stale — its next redraw (eg. on backspace)
        # can land on and overwrite characters of the prompt itself.
        channel = client.invoke_shell(term="xterm-256color", width=cols, height=rows)
        _set_session(sid, _SSHSession(client, channel, log_id))
        app = current_app._get_current_object()
        socketio.start_background_task(_stream_output, sid, channel, app, log_id)

        emit("ssh_connected", {})

    def on_ssh_input(self, payload):
        session = _get_session(request.sid)
        if session is None:
            return
        data = (payload or {}).get("data", "")
        if data:
            session.channel.send(data)

    def on_ssh_resize(self, payload):
        session = _get_session(request.sid)
        if session is None:
            return
        payload = payload or {}
        try:
            cols = int(payload.get("cols", 80))
            rows = int(payload.get("rows", 24))
        except (TypeError, ValueError):
            return
        session.channel.resize_pty(width=cols, height=rows)


def register_ssh_namespace():
    socketio.on_namespace(SSHSessionNamespace(NAMESPACE))

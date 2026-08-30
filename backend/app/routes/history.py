from flask import Blueprint, g, jsonify

from ..models import ConnectionLog
from ..security.auth import login_required

history_bp = Blueprint("history", __name__, url_prefix="/api")


def _log_to_dict(log):
    return {
        "id": log.id,
        "connection_id": log.connection_id,
        "connection_name": log.connection_name,
        "host": log.host,
        "port": log.port,
        "username": log.username,
        "status": log.status,
        "error_message": log.error_message,
        "has_recording": bool(log.recording),
        "started_at": log.started_at.isoformat() if log.started_at else None,
        "ended_at": log.ended_at.isoformat() if log.ended_at else None,
    }


@history_bp.get("/connection-logs")
@login_required
def list_connection_logs():
    logs = (
        ConnectionLog.query.filter_by(user_id=g.current_user.id)
        .order_by(ConnectionLog.started_at.desc())
        .limit(100)
        .all()
    )
    return jsonify([_log_to_dict(l) for l in logs]), 200


@history_bp.get("/connection-logs/<int:log_id>/recording")
@login_required
def get_connection_log_recording(log_id):
    log = ConnectionLog.query.filter_by(id=log_id, user_id=g.current_user.id).first()
    if log is None:
        return jsonify(error="connection log not found"), 404

    return jsonify(recording=log.recording), 200

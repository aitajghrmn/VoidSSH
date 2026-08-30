from app import create_app
from app.extensions import socketio

app = create_app()

if __name__ == "__main__":
    # allow_unsafe_werkzeug: this app runs the Werkzeug dev server directly
    # (no eventlet/gevent worker) in every environment, dev and prod alike.
    socketio.run(app, host="0.0.0.0", port=5000, debug=app.config["DEBUG"], allow_unsafe_werkzeug=True)

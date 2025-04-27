# app.py

import eventlet
eventlet.monkey_patch()

import sys
import os
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # Add parent directory to path


from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS
from routes.auth_routes import register
from sockets.authenticate_socket import authenticate
from config import DATA_FILE

app = Flask(__name__)
CORS(app)

socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='eventlet',
    ping_timeout=60,
    ping_interval=30,
    max_http_buffer_size=10 * 1024 * 1024  # 10MB max
)

# Register routes
app.add_url_rule('/register', view_func=register, methods=["POST"])

# Socket events
socketio.on_event('authenticate', authenticate)

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)

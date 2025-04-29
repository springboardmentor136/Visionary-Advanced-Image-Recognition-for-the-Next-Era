import eventlet
eventlet.monkey_patch()

import sys
import os
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS
from routes.auth_routes import register
from routes.api_routes import api_bp # <-- Import the new Blueprint
from sockets.authenticate_socket import authenticate
from config import DATA_FILE, LOG_FILE # <-- Import LOG_FILE if needed elsewhere

app = Flask(__name__)
CORS(app) # Allow all origins for now, restrict in production

socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='eventlet',
    ping_timeout=60,
    ping_interval=30,
    max_http_buffer_size=10 * 1024 * 1024
)

# Register HTTP routes
app.add_url_rule('/register', view_func=register, methods=["POST"])
app.register_blueprint(api_bp) # <-- Register the API blueprint

# Socket events
socketio.on_event('authenticate', authenticate)



if __name__ == "__main__":
    # Ensure data files exist (optional, creates empty files if not found)
    for file_path in [DATA_FILE, LOG_FILE]:
        if not os.path.exists(file_path):
            try:
                with open(file_path, 'w') as f:
                    if file_path.endswith('.json'):
                        f.write('[]') # Initialize JSON files as empty lists
                print(f"Created empty file: {file_path}")
            except IOError as e:
                 print(f"Warning: Could not create file {file_path}. Error: {e}")

    print("Starting Flask-SocketIO server...")
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
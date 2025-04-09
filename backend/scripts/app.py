import eventlet
eventlet.monkey_patch() 

import os
import json
import base64
import numpy as np
import cv2
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from deepface import DeepFace
from threading import Semaphore
import time

app = Flask(__name__)
CORS(app)

# Configuration
MAX_CONCURRENT_PROCESSES = 4
FRAME_SKIP = 3  # Process every 3rd frame
MAX_FRAME_WIDTH = 640
PROCESSING_TIMEOUT = 5  # seconds

# Ensure data.json is saved inside backend folder
DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data.json")
processing_semaphore = Semaphore(MAX_CONCURRENT_PROCESSES)
frame_counter = 0

socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='eventlet',
    ping_timeout=60,
    ping_interval=30,
    max_http_buffer_size=10 * 1024 * 1024  # 10MB max
)

def load_data():
    """Load existing embeddings from data.json"""
    try:
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def save_data(data):
    """Save embeddings to data.json properly"""
    try:
        with open(DATA_FILE, "w") as f:
            json.dump(data, f, indent=4)  # Pretty format JSON
    except Exception as e:
        print(f"Error saving data: {str(e)}")

def extract_embedding(image):
    try:
        results = DeepFace.represent(
            img_path=image,
            model_name="Facenet",
            detector_backend="opencv",
            enforce_detection=True
        )
        return results[0]["embedding"] if results else None
    except Exception as e:
        print(f"Embedding extraction failed: {str(e)}")
        return None

@socketio.on('connect')
def handle_connect():
    print('Client connected:', request.sid)

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected:', request.sid)

@app.route("/register", methods=["POST"])
def register():
    name = request.form.get("name")
    image_file = request.files.get("image")

    if not name or not image_file:
        return jsonify({"error": "Name and image are required"}), 400

    try:
        image_bytes = image_file.read()
        image_array = np.frombuffer(image_bytes, dtype=np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
        
        # Resize if too large
        if image.shape[1] > MAX_FRAME_WIDTH:
            scale = MAX_FRAME_WIDTH / image.shape[1]
            image = cv2.resize(image, (0, 0), fx=scale, fy=scale)

        embedding = extract_embedding(image)
        if embedding is None:
            return jsonify({"error": "Face not detected"}), 400

        stored_data = load_data()
        stored_data.append({"name": name, "embedding": embedding})
        save_data(stored_data)

        return jsonify({"message": "User registered successfully"})
    except Exception as e:
        return jsonify({"error": f"Registration failed: {str(e)}"}), 500

def process_frame(image_data):
    try:
        if isinstance(image_data, str) and image_data.startswith('data:image'):
            image_data = image_data.split(',')[1]

        image_bytes = base64.b64decode(image_data)
        image_array = np.frombuffer(image_bytes, dtype=np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
        
        if image is None:
            raise ValueError("Invalid image data")

        if image.shape[1] > MAX_FRAME_WIDTH:
            scale = MAX_FRAME_WIDTH / image.shape[1]
            image = cv2.resize(image, (0, 0), fx=scale, fy=scale)

        return image
    except Exception as e:
        print(f"Frame processing error: {str(e)}")
        raise

@socketio.on("authenticate")
def authenticate(data):
    global frame_counter
    
    if not data or not isinstance(data, dict):
        return emit("auth_response", {"error": "Invalid data format"})
        
    if not processing_semaphore.acquire(blocking=False):
        return emit("auth_response", {"error": "Server busy, please try again"})

    try:
        start_time = time.time()
        frame_counter += 1
        
        if frame_counter % FRAME_SKIP != 0:
            return

        image_data = data.get("image")
        if not image_data:
            return emit("auth_response", {"error": "Image is required"})

        with eventlet.Timeout(PROCESSING_TIMEOUT):
            image = process_frame(image_data)
            embedding = extract_embedding(image)
            
            if not embedding:
                return emit("auth_response", {"error": "Face not detected"})

            stored_data = load_data()
            best_match = None
            min_similarity = float('inf')

            for user in stored_data:
                stored_embedding = np.array(user["embedding"])
                similarity = np.linalg.norm(stored_embedding - np.array(embedding))
                
                if similarity < min_similarity:
                    min_similarity = similarity
                    best_match = user["name"]

            if min_similarity < 8:  # Threshold
                return emit("auth_response", {
                    "name": best_match
                })
            else:
                return emit("auth_response", {"name": "Unknown"})
    except eventlet.Timeout:
        return emit("auth_response", {"error": "Processing timeout"})
    except Exception as e:
        print(f"Authentication error: {str(e)}")
        return emit("auth_response", {"error": "Processing failed"})
    finally:
        processing_semaphore.release()
        if 'image' in locals():
            del image  # Clean up memory

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)

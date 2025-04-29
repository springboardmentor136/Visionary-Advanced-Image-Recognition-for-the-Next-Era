from flask import request, jsonify
from helpers.data_storage import load_data, save_data
from helpers.face_recognition import extract_embedding
import numpy as np
import cv2
from datetime import datetime  
from config import MAX_FRAME_WIDTH, DATA_FILE

def register():
    name = request.form.get("name")
    role = request.form.get("role")  
    image_file = request.files.get("image")

    if not name or not role or not image_file:
        return jsonify({"error": "Name, role, and image are required"}), 400

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

        # Prepare new user data
        new_user = {
            "name": name,
            "role": role,
            "registration_date": datetime.now().strftime("%d-%m-%Y"),
            "registration_time": datetime.now().strftime("%H:%M:%S"),
            "embedding": embedding
        }

        # Load existing data
        stored_data = load_data(DATA_FILE)
        stored_data.append(new_user)

        # Save updated data
        save_data(DATA_FILE, stored_data)

        return jsonify({"message": "User registered successfully"})
    except Exception as e:
        return jsonify({"error": f"Registration failed: {str(e)}"}), 500

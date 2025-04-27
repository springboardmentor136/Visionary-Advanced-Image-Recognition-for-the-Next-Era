# sockets/authenticate_socket.py

import eventlet
import time
import numpy as np
from flask_socketio import emit
from threading import Semaphore
from helpers.frame_processing import process_frame
from helpers.face_recognition import extract_embedding
from helpers.data_storage import load_data
from config import MAX_CONCURRENT_PROCESSES, FRAME_SKIP, PROCESSING_TIMEOUT, DATA_FILE

# Semaphore to control concurrency
processing_semaphore = Semaphore(MAX_CONCURRENT_PROCESSES)
frame_counter = 0

def authenticate(data):
    global frame_counter
    
    if not data or not isinstance(data, dict):
        return emit("auth_response", {"error": "Invalid data format"})
        
    if not processing_semaphore.acquire(blocking=False):
        return emit("auth_response", {"error": "Server busy, please try again"})

    try:
        start_time = time.time()
        frame_counter += 1
        
        # Skip frames based on the FRAME_SKIP setting
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

            # Load data from data.json
            stored_data = load_data(DATA_FILE)
            best_match = None
            min_similarity = float('inf')

            # Compare the embeddings to find the best match
            for user in stored_data:
                stored_embedding = np.array(user["embedding"])
                similarity = np.linalg.norm(stored_embedding - np.array(embedding))
                
                if similarity < min_similarity:
                    min_similarity = similarity
                    best_match = user["name"]

            # Check similarity against threshold
            if min_similarity < 8:  # Threshold for match
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
            del image  # Clean up memory to avoid memory leaks

import eventlet
import time
import numpy as np
from flask_socketio import emit
from threading import Semaphore
from helpers.frame_processing import process_frame
from helpers.face_recognition import extract_embedding
from helpers.data_storage import load_data, save_data
from config import MAX_CONCURRENT_PROCESSES, FRAME_SKIP, PROCESSING_TIMEOUT, DATA_FILE

# Semaphore to control concurrency
processing_semaphore = Semaphore(MAX_CONCURRENT_PROCESSES)
frame_counter = 0

def authenticate(data):
    global frame_counter
    global processing_semaphore #

    if not data or not isinstance(data, dict):
        return emit("auth_response", {"error": "Invalid data format"})

    # Check if this is a delete request
    action = data.get('action')
    username_to_delete = data.get('username') # Get username if action is delete

    # Ab yeh line kaam karni chahiye
    if not processing_semaphore.acquire(blocking=False):
        # Handle delete response if busy
        if action == 'delete':
            return emit("delete_response", {"status": "failed", "error": "Server busy, please try again"})
        else:
            return emit("auth_response", {"error": "Server busy, please try again"})


    try:
        start_time = time.time()
        frame_counter += 1

        if frame_counter % FRAME_SKIP != 0:
             # Release semaphore if skipping frame
             processing_semaphore.release()
             return # Important to return here

        image_data = data.get("image")
        if not image_data:
             # Release semaphore if no image data
             processing_semaphore.release()
             if action == 'delete':
                 return emit("delete_response", {"status": "failed", "error": "Image is required for verification"})
             else:
                 return emit("auth_response", {"error": "Image is required"})


        with eventlet.Timeout(PROCESSING_TIMEOUT):
            image = process_frame(image_data)
            embedding = extract_embedding(image)

            if not embedding:
                # If it was a delete request, send a specific failure message
                if action == 'delete':
                     return emit("delete_response", {"status": "failed", "error": "Face not detected for verification"})
                else:
                     return emit("auth_response", {"error": "Face not detected"})


            stored_data = load_data(DATA_FILE)
            best_match = None
            matched_user = None
            min_similarity = float('inf')

            for user in stored_data:
                # Ensure embedding exists and is a list/array before converting
                if "embedding" in user and isinstance(user["embedding"], (list, np.ndarray)):
                    stored_embedding = np.array(user["embedding"])
                    similarity = np.linalg.norm(stored_embedding - np.array(embedding))

                    if similarity < min_similarity:
                        min_similarity = similarity
                        best_match = user["name"]
                        matched_user = user
                else:
                    print(f"Warning: Skipping user {user.get('name', 'Unknown')} due to missing or invalid embedding.")


            # --- Authentication Logic ---
            # Ensure matched_user is not None before proceeding
            if matched_user and min_similarity < 8:  # Threshold for match
                # --- Check if Action is Delete ---
                if action == 'delete' and matched_user['name'] == username_to_delete:
                    # Re-authentication successful for deletion
                    try:
                        # Remove the user from the list
                        updated_users = [user for user in stored_data if user['name'] != username_to_delete]
                        save_data(DATA_FILE, updated_users)
                        print(f"User '{username_to_delete}' deleted successfully after re-authentication.")
                        # Send a success response for deletion
                        return emit("delete_response", {"status": "deleted", "name": username_to_delete})
                    except Exception as e:
                        print(f"Error deleting user {username_to_delete} after re-auth: {str(e)}")
                        return emit("delete_response", {"status": "failed", "error": "Failed to delete user data"})

                elif action == 'delete':
                     # Re-authentication successful, but face matched a DIFFERENT user than expected
                     print(f"Delete request for {username_to_delete} failed: Re-authenticated as {matched_user['name']}")
                     return emit("delete_response", {"status": "failed", "error": "Verification face does not match the account to be deleted."})

                else:
                    # Normal authentication successful
                    return emit("auth_response", {
                        "name": matched_user["name"],
                        "role": matched_user.get("role", "user"), # Default to 'user' if role missing
                        "registration_date": matched_user.get("registration_date", ""),
                        "registration_time": matched_user.get("registration_time", "")
                    })
            else:
                # Authentication failed
                if action == 'delete':
                    return emit("delete_response", {"status": "failed", "error": "Verification failed. Account not deleted."})
                else:
                    return emit("auth_response", {"name": "Unknown"})

    except eventlet.Timeout:
         if action == 'delete':
             return emit("delete_response", {"status": "failed", "error": "Verification timeout"})
         else:
             return emit("auth_response", {"error": "Processing timeout"})
    except Exception as e:
        print(f"Authentication/Deletion error: {str(e)}")
        if action == 'delete':
             return emit("delete_response", {"status": "failed", "error": "Processing failed during verification"})
        else:
             return emit("auth_response", {"error": "Processing failed"})
    finally:
        # Ensure semaphore is always released
        processing_semaphore.release()
        # Clean up image variable if it exists
        if 'image' in locals() and image is not None:
            del image
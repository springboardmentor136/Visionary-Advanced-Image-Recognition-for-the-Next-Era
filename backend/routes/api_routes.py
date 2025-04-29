# routes/api_routes.py

from flask import Blueprint, request, jsonify
from helpers.data_storage import load_data, save_data
from config import DATA_FILE, LOG_FILE
from datetime import datetime
import os

# Create a Blueprint for API routes
api_bp = Blueprint('api', __name__, url_prefix='/api')

# --- API Endpoint to Record Login Log ---
@api_bp.route('/log-login', methods=['POST'])
def record_login_log():
    data = request.get_json()
    username = data.get('username')
    login_date = data.get('date') # Expecting format like 'YYYY-MM-DD'
    login_time = data.get('time') # Expecting format like 'HH:MM:SS'

    if not username or not login_date or not login_time:
        return jsonify({"error": "Username, date, and time are required"}), 400

    log_entry = {
        "name": username,
        "date": login_date,
        "time": login_time
    }

    try:
        # Load existing logs or initialize if file doesn't exist
        if os.path.exists(LOG_FILE):
            logs = load_data(LOG_FILE)
            if not isinstance(logs, list): # Handle case where file might be corrupted/empty
                 logs = []
        else:
            logs = []

        logs.append(log_entry)
        save_data(LOG_FILE, logs)
        return jsonify({"message": "Login logged successfully"}), 201
    except Exception as e:
        print(f"Error logging login: {str(e)}")
        return jsonify({"error": "Failed to log login"}), 500

# --- API Endpoint to Get All Registered Users (for Admin) ---
@api_bp.route('/users', methods=['GET'])
def get_all_users():
    # !! IMPORTANT: Add authentication/authorization check here later
    # to ensure only admins can access this !!
    try:
        users = load_data(DATA_FILE)
        # Remove embeddings before sending to frontend for security and size
        users_without_embeddings = [
            {k: v for k, v in user.items() if k != 'embedding'}
            for user in users
        ]
        return jsonify(users_without_embeddings)
    except Exception as e:
        print(f"Error fetching users: {str(e)}")
        return jsonify({"error": "Failed to fetch users"}), 500

# --- API Endpoint to Get Login Logs (for Admin/User) ---
@api_bp.route('/login-logs', methods=['GET'])
def get_login_logs():
    # !! IMPORTANT: Add authentication/authorization check here later !!
    filter_username = request.args.get('username') # For filtering user-specific logs

    try:
        if not os.path.exists(LOG_FILE):
             return jsonify([]) # Return empty list if log file doesn't exist

        logs = load_data(LOG_FILE)
        if not isinstance(logs, list):
            return jsonify([]) # Return empty list if file is not a list

        if filter_username:
            filtered_logs = [log for log in logs if log.get('name') == filter_username]
            return jsonify(filtered_logs)
        else:
            # If no username filter, return all logs (for admin)
            return jsonify(logs)
    except Exception as e:
        print(f"Error fetching login logs: {str(e)}")
        return jsonify({"error": "Failed to fetch login logs"}), 500

# --- API Endpoint to Delete a User (by Admin) ---
@api_bp.route('/users/<string:username>', methods=['DELETE'])
def delete_user_by_admin(username):
    # !! IMPORTANT: Add authentication/authorization check here later
    # to ensure only admins can access this !!
    try:
        users = load_data(DATA_FILE)
        user_found = False
        updated_users = []
        for user in users:
            if user.get('name') == username:
                user_found = True
                # Don't add this user to the new list
            else:
                updated_users.append(user)

        if not user_found:
            return jsonify({"error": "User not found"}), 404

        save_data(DATA_FILE, updated_users)
        return jsonify({"message": f"User '{username}' deleted successfully"})
    except Exception as e:
        print(f"Error deleting user {username}: {str(e)}")
        return jsonify({"error": f"Failed to delete user {username}"}), 500
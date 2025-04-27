# helpers/data_storage.py

import json
import os

def load_data(file_path):
    """Load existing embeddings from data.json"""
    try:
        with open(file_path, "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def save_data(file_path, data):
    """Save embeddings to data.json properly"""
    try:
        with open(file_path, "w") as f:
            json.dump(data, f, indent=4)  # Pretty format JSON
    except Exception as e:
        print(f"Error saving data: {str(e)}")

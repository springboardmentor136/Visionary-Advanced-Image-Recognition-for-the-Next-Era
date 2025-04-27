# helpers/frame_processing.py

import numpy as np
import cv2
import base64

def process_frame(image_data, max_frame_width=640):
    """Process image to resize and decode."""
    try:
        if isinstance(image_data, str) and image_data.startswith('data:image'):
            image_data = image_data.split(',')[1]

        image_bytes = base64.b64decode(image_data)
        image_array = np.frombuffer(image_bytes, dtype=np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

        if image is None:
            raise ValueError("Invalid image data")

        # Resize if image width is too large
        if image.shape[1] > max_frame_width:
            scale = max_frame_width / image.shape[1]
            image = cv2.resize(image, (0, 0), fx=scale, fy=scale)

        return image
    except Exception as e:
        print(f"Frame processing error: {str(e)}")
        raise

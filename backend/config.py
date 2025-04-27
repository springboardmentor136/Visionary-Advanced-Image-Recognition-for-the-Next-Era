
import os

MAX_CONCURRENT_PROCESSES = 4
FRAME_SKIP = 3  # Process every 3rd frame
MAX_FRAME_WIDTH = 640
PROCESSING_TIMEOUT = 5  # seconds
DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data.json')  # Adjusted path

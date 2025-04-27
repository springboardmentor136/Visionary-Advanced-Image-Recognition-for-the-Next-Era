# helpers/face_recognition.py

from deepface import DeepFace

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

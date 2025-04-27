"""
facenet_model.py

This script was used to **fine-tune a simple classifier** on **FaceNet embeddings**
extracted from a subset of the **LFW (Labeled Faces in the Wild)** dataset.

Note:
- The FaceNet model itself was **not retrained**; only a lightweight neural network classifier
  was trained on top of the fixed embeddings.
- This setup is intended **for demonstration purposes** only and is not a production-grade training pipeline.
"""

"""
import numpy as np
from sklearn.datasets import fetch_lfw_people
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout
from tensorflow.keras.utils import to_categorical
from tensorflow.keras.callbacks import EarlyStopping
from tensorflow.keras.regularizers import l2
from facenet_pytorch import MTCNN, InceptionResnetV1
from PIL import Image
import torch

# Parameters
MAX_IMAGES_PER_PERSON = 50
UNIQUE_PEOPLE = 5

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# Load LFW dataset
faces = fetch_lfw_people(min_faces_per_person=100, resize=1.0, color=True,
                         slice_=(slice(60, 188), slice(60, 188)), funneled=True)

def numpy_to_pil(img):
    img = np.clip(img * 255.0, 0, 255).astype(np.uint8)
    if img.ndim == 2:
        img = np.stack([img] * 3, axis=-1)
    elif img.shape[-1] != 3:
        img = img[..., :3]
    return Image.fromarray(img)

def extract_embeddings(images, labels):
    mtcnn = MTCNN(image_size=160, device=device)
    resnet = InceptionResnetV1(pretrained='vggface2').eval().to(device)

    embeddings = []
    new_labels = []
    skipped = 0

    for idx, (img, label) in enumerate(zip(images, labels)):
        try:
            pil_img = numpy_to_pil(img).convert('RGB')
            pil_img = pil_img.resize((160, 160))

            face_tensor = mtcnn(pil_img)

            if face_tensor is not None:
                face_tensor = face_tensor.unsqueeze(0).to(device)
                with torch.no_grad():
                    embedding = resnet(face_tensor).cpu().numpy()
                embeddings.append(embedding[0])
                new_labels.append(label)
            else:
                skipped += 1
        except Exception as e:
            skipped += 1

    print(f"Extracted {len(embeddings)} embeddings. Skipped {skipped} images.")
    return np.array(embeddings), np.array(new_labels)

def load_dummy_model():
    # Preprocess dataset
    mask = np.zeros(faces.target.shape, dtype=bool)
    selected_targets = np.unique(faces.target)[:UNIQUE_PEOPLE]

    for target in selected_targets:
        indices = np.where(faces.target == target)[0][:MAX_IMAGES_PER_PERSON]
        mask[indices] = 1

    x_faces = faces.images[mask]
    y_faces = faces.target[mask]

    x_faces = x_faces / 255.0

    # Extract embeddings
    X, y = extract_embeddings(x_faces, y_faces)

    # Encode labels
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)
    y_onehot = to_categorical(y_encoded)

    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(X, y_onehot, test_size=0.2, random_state=42)

    # Build model
    model = Sequential([
        Dense(512, activation='relu', input_shape=(X_train.shape[1],), kernel_regularizer=l2(0.01)),
        Dropout(0.5),
        Dense(256, activation='relu', kernel_regularizer=l2(0.01)),
        Dropout(0.5),
        Dense(128, activation='relu', kernel_regularizer=l2(0.01)),
        Dense(y_train.shape[1], activation='softmax')
    ])

    model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])

    # Early stopping
    early_stopping = EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True)

    # Train the model
    model.fit(X_train, y_train, validation_data=(X_test, y_test), epochs=10, batch_size=32, callbacks=[early_stopping])

    # Evaluate the model
    loss, accuracy = model.evaluate(X_test, y_test)
    print(f"Dummy model Test Accuracy: {accuracy * 100:.2f}%")

    # Save the model to a file
    model.save('/model/model.h5')  # This will save the model in the current directory

    print("Model saved as 'model.h5'.")

    return model


# If you want to directly train when running the script
if __name__ == "__main__":
    load_dummy_model()
"""

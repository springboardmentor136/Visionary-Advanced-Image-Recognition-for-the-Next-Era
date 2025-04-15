# Visionary-Advanced-Image-Recognition-for-the-Next-Era
This project is a real-time face recognition authentication system using Flask (Python) for the backend and React for the frontend. It leverages deep learning-based face embeddings to identify users based on their facial features in live video streams.

![Screenshot 2025-04-13 152329](https://github.com/user-attachments/assets/5423129c-487a-4923-bd39-b06fe16134ec)



## Features
 - Real-time face authentication using WebSocket (Socket.IO)
 - Registration of new users with name and image
 - Image-based face recognition using facial embeddings
 - Fast and accurate recognition with smooth frontend integration
 - Uses FaceNet model via DeepFace for high-quality embeddings
 - Frontend built with React using face-api.js for capturing and sending images

## Technologies Used
 - Backend: Flask, Flask-SocketIO
 - Frontend: React, face-api.js, Socket.IO-client, Tailwind CSS
 - Model: FaceNet (for generating facial embeddings)

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/springboardmentor136/Visionary-Advanced-Image-Recognition-for-the-Next-Era.git
   ```
2. Navigate to the project directory:
   ```bash
   cd Visionary-Advanced-Image-Recognition-for-the-Next-Era
   ```
3. Navigate to the backend/ directory:
   ```bash
   cd backend
   ```
4. Activate virtual environment(windows):
   ```bash
   venv\Scripts\activate
   ```
5. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
6. Run the backend:
   ```bash
   python app.py
   ```
7. Navigate to the frontend/ directory:
   ```bash
   cd frontend
   ```  
8. Install dependencies:
   ```bash
   npm install
   ```
9. Start the development server:
   ```bash
   npm run dev
   ```







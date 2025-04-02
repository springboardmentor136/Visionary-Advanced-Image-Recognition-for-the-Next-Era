import React, { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import * as faceapi from "face-api.js";

const FaceAuthentication = () => {
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false); // Added loading state
  const [webcamError, setWebcamError] = useState(false); // State for webcam availability
  const webcamRef = useRef(null);

  const videoConstraints = {
    facingMode: "user",
    width: 326, // Higher resolution width
    height: 434, // Higher resolution height
  };


  useEffect(() => {
    const loadModels = async () => {
      await faceapi.nets.ssdMobilenetv1.loadFromUri("/models/ssdMobilenetv1");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models//faceLandmark68Net");
      await faceapi.nets.faceRecognitionNet.loadFromUri("/models/faceRecognitionNet");
    };
    loadModels();
  }, []);

  
  const handleAuthenticate = async () => {
    setLoading(true); // Start loading
    setStatus("Authenticating..."); // Feedback for ongoing process
    const screenshot = webcamRef.current.getScreenshot();

    if (!screenshot) {
      setWebcamError(true); // Handle empty webcam capture
      setStatus("❌ Failed to capture image. Please try again."); // Error for empty image
      setLoading(false);
      return;
    }

    setWebcamError(false); // Reset webcam error state if image capture is successful

    const image = await faceapi.bufferToImage(screenshot);
    const detections = await faceapi.detectSingleFace(image).withFaceLandmarks().withFaceDescriptor();

    if (!detections) {
      setStatus("❌ No face detected. Please try again.");
      setLoading(false);
      return;
    }

    const faceDescriptor = detections.descriptor;
    const registeredFaceDescriptor = JSON.parse(localStorage.getItem("faceDescriptor"));
    const threshold = 0.6; // Adjust this value for comparison

    if (!registeredFaceDescriptor) {
      setStatus("❌ No registered face found. Please register first.");
      setLoading(false);
      return;
    }

    // Calculate the Euclidean distance between the stored and detected face descriptors
    const distance = faceapi.euclideanDistance(registeredFaceDescriptor, faceDescriptor);

    if (distance < threshold) {
      setStatus("✅ Authentication successful!");
    } else {
      setStatus("❌ Authentication failed!");
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center p-6">
      <img
        src="https://www.softwebsolutions.com/wp-content/uploads/2022/05/Facial-Recognition.jpg"
        alt="Facial Recognition Background"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <h1 className="text-2xl font-bold text-white-500 z-10 text-center">Face Authentication</h1>
      {webcamError && (
        <p className="mt-2 text-red-500 font-medium">
          ❌ Webcam not available. Please grant permission or try again.
        </p>
      )}
      <Webcam
        audio={false}
        ref={webcamRef}
        videoConstraints={videoConstraints}
        className="border-2 rounded-lg shadow-md mt-4 z-10"
      />
      <div className="mt-4 z-10">
        <button
          onClick={handleAuthenticate}
          className={`bg-red-500 text-white py-2 px-4 rounded border-2 border-black hover:bg-blue-600 ${
            loading ? "cursor-not-allowed opacity-50" : ""
          } hover:scale-110 transition-transfrom ease-linear duration-300`}
          disabled={loading} // Disable button during loading
        >
          {loading ? "Authenticating..." : "Authenticate Face"} {/* Dynamic button text */}
        </button>
        {loading && (
          <div className="spinner-border text-blue-500 mt-2" role="status"></div>
        )}
      </div>
      <div className="mt-4 flex items-center" aria-live="polite">
        <span className={status.includes("success") ? "text-green-500" : "text-red-500"}>
          {status}
        </span>
      </div>
    </div>
  );
};

export default FaceAuthentication;

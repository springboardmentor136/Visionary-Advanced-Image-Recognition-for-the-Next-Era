import React, { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import * as faceapi from "face-api.js";

const FaceRegistration = () => {
  const [name, setName] = useState("");
  const [isFaceRegistered, setIsFaceRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [webcamError, setWebcamError] = useState(false);
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  const videoConstraints = {
    facingMode: "user",
    width: 315,
    height: 434,
  };

  useEffect(() => {
    // Load face-api.js models when component mounts
    const loadModels = async () => {
      await faceapi.nets.ssdMobilenetv1.loadFromUri("/models/ssdMobilenetv1");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models//faceLandmark68Net");
      await faceapi.nets.faceRecognitionNet.loadFromUri("/models/faceRecognitionNet");
;
    };
    loadModels();
  }, []);


  const handleRegister = async () => {
    if (!name) {
      alert("Please enter your name before registering.");
      return;
    }

    setLoading(true);
    const screenshot = webcamRef.current.getScreenshot();

    if (!screenshot) {
      setWebcamError(true);
      setLoading(false);
      return;
    }

    setWebcamError(false);
    

   // Get image data for face-api.js
   const image = await faceapi.bufferToImage(screenshot);
   const detections = await faceapi.detectSingleFace(image).withFaceLandmarks().withFaceDescriptor();

   if (!detections) {
     alert("No face detected, please try again.");
     setLoading(false);
     return;
   }

   // Get the face descriptor (embedding) and save it with the name
   const faceDescriptor = detections.descriptor;

   // Save face data to localStorage or a database
   localStorage.setItem("name", name);
   localStorage.setItem("faceDescriptor", JSON.stringify(faceDescriptor));

   setIsFaceRegistered(true);
   setLoading(false);
   console.log("Face registered successfully");
 };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen">
      <img
        src="https://cdn-ekngd.nitrocdn.com/rMkjwxgvPiKSDMBlfOJMgOwCAEIoHTrp/assets/images/optimized/rev-f1a7810/www.hyena.ai/wp-content/uploads/2021/08/face-recognition-app.png"
        alt="Facial Recognition Background"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="z-10 max-w-xl rounded-lg shadow-md text-center">
        <h1 className="sm:text-2xl bg-white p-5 rounded-full sm:font-bold text-blue-800 w-1/2 m-auto mt-10">AI Face Registration</h1>

        {webcamError && (
        <div className="mt-2 p-4 bg-red-200 text-red-800 rounded">
          <p>❌ Webcam not available. Please grant permission or try again.</p>
        </div>
        )}


        <div className="flex flex-col items-center sm:flex-row sm:gap-x-12 sm:ml-32">
          <Webcam
            audio={false}
            ref={webcamRef}
            videoConstraints={videoConstraints}
            className="border-2 rounded-lg shadow-md mt-10 mb-10"
          />
          <canvas 
            ref={canvasRef} 
            style={{ position: "absolute" }} 
          />
          <div className="flex flex-col space-y-4 w-full max-w-sm relative">
            <input
              type="text"
              placeholder="Enter your name"
              className="border-2 border-purple-500 px-4 py-2 rounded-md text-black sm:w-[112px]"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            
            {name === "" && !loading && (
              <div className="flex flex-col items-center mt-1">
                <span className="text-xl text-red-500 -indent-72 sm:-indent-10">^</span>
                <p className="text-red-500 font-medium -indent-40 sm:indent-0">Name is required!</p>
              </div>
            )}

            <button
              onClick={handleRegister}
              className={`bg-green-500 text-white py-2 rounded-md transition ${
                loading ? "cursor-not-allowed opacity-50" : "hover:bg-green-600 hover:scale-105"
              }`}
              disabled={loading}
            >
              {loading ? "Registering..." : "Register Face"}
            </button>

            {loading && <div className="spinner-border text-green-500 mt-2" role="status"></div>}
          </div>
        </div>

        {isFaceRegistered && (
          <button className="w-full bg-green-500 text-white py-2 rounded-md cursor-not-allowed opacity-50 mt-4">
            Registered
          </button>
        )}
      </div>
    </div>
  );
};

export default FaceRegistration;

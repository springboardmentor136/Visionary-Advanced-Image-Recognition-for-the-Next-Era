import React, { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import * as faceapi from "face-api.js";
import { io } from "socket.io-client";
import Authentic from "../assets/Authentication.webp";
import { toast, Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
 
// Constants
const VIDEO_WIDTH = 326;
const VIDEO_HEIGHT = 434;
const DETECTION_CONFIDENCE_THRESHOLD = 90;
 
const FaceAuthentication = () => {
  const [loading, setLoading] = useState(false);
  const [webcamError, setWebcamError] = useState(false);
  const [userName, setUserName] = useState(null);
  const [isWebcamReady, setIsWebcamReady] = useState(false);
  const [isConfidenceHigh, setIsConfidenceHigh] = useState(false);
  const [hideFaceNotDetectedMessage, setHideFaceNotDetectedMessage] = useState(false);
  // const [isAuthenticating, setIsAuthenticating] = useState(false);
 
  const navigate = useNavigate();
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const hasAuthenticatedRef = useRef(false);
  const detectionBoxRef = useRef(null);
 
  const isHighConfidence = (score) => score * 100 >= DETECTION_CONFIDENCE_THRESHOLD;
 
  useEffect(() => {
    const loadModels = async () => {
      await faceapi.nets.ssdMobilenetv1.loadFromUri("/models/ssdMobilenetv1");
    };
    loadModels();
  }, []);
 
  useEffect(() => {
    if (!isWebcamReady || hasAuthenticatedRef.current) return;
 
    const detectFace = async () => {
      if (!webcamRef.current) return;
 
      const screenshot = webcamRef.current.getScreenshot();
      if (!screenshot) return;
 
      const byteCharacters = atob(screenshot.split(",")[1]);
      const byteArray = new Uint8Array([...byteCharacters].map((ch) => ch.charCodeAt(0)));
      const imageBlob = new Blob([byteArray], { type: "image/webp" });
 
      const image = await faceapi.bufferToImage(imageBlob);
      const detection = await faceapi.detectSingleFace(image)
 
      if (detection) {
        const { box, score } = detection;
        const confidence = (score * 100).toFixed(2);
 
        detectionBoxRef.current = box;
        setIsConfidenceHigh(isHighConfidence(score));
 
        drawBoundingBox(box, userName || `Confidence: ${confidence}%`, !!userName);
 
        const croppedFaceDataUrl = cropFaceFromImage(image, box);
        if (loading && isHighConfidence(score) && socketRef.current && !hasAuthenticatedRef.current) {
          socketRef.current.emit("authenticate", { image: croppedFaceDataUrl });
          // setIsAuthenticating(true);
        }
      } else {
        setIsConfidenceHigh(false);
      }
    };
 
    const interval = setInterval(detectFace, 1000); // ⏱️ Auth doesn't need fast detection
    return () => clearInterval(interval);
  }, [isWebcamReady, loading]);
 
  useEffect(() => {
    const socket = io("http://localhost:5000", { transports: ["websocket"] });
 
    socket.on("connect", () => console.log("✅ WebSocket connected"));
 
    socket.on("auth_response", (data) => {
      console.log("🧠 Auth response:", data);
 
      if (data.name.toLowerCase() === "unknown") {
        toast.error("Unrecognized face. Try again.", { position: "top-center" });
        hasAuthenticatedRef.current = false;
        setLoading(false);
        // setIsAuthenticating(false);
        if (detectionBoxRef.current) {
          drawBoundingBox(detectionBoxRef.current, "Unknown", false);
        }
        return;
      }
 
      hasAuthenticatedRef.current = true;
      setUserName(data.name);
      setLoading(false);
      drawBoundingBox(detectionBoxRef.current, data.name, true);
      toast.success(`Authenticated as ${data.name}`, { position: "top-center" });
 
      setTimeout(() => navigate("/"), 3000);
    });
 
    socketRef.current = socket;
  }, []);
 
  useEffect(() => {
    setHideFaceNotDetectedMessage(isConfidenceHigh);
  }, [isConfidenceHigh]);
 
  const cropFaceFromImage = (image, box) => {
    const tempCanvas = document.createElement("canvas");
    const ctx = tempCanvas.getContext("2d");
    tempCanvas.width = box.width;
    tempCanvas.height = box.height;
    ctx.drawImage(image, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);
    return tempCanvas.toDataURL("image/webp");
  };
 
  const drawBoundingBox = (box, label = "", isAuthenticated = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
 
    ctx.strokeStyle = isAuthenticated ? "limegreen" : "red";
    ctx.lineWidth = 3;
    ctx.strokeRect(box.x, box.y, box.width, box.height);
 
    ctx.fillStyle = ctx.strokeStyle;
    ctx.font = "20px Arial";
    ctx.fillText(label, box.x, box.y - 10);
  };
 
  const captureAndSendFrames = () => {
    if (hasAuthenticatedRef.current) return;
    setUserName(null);
    hasAuthenticatedRef.current = false;
    setLoading(true);
  };
 
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      <Toaster />
      <img
        src={Authentic}
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover z-0"
      />
 
      <h1 className="text-md sm:text-2xl font-bold text-white z-10 text-center mb-2">
        Face Authentication
      </h1>
 
      {webcamError && (
        <p className="text-red-500 font-medium z-10">
          ❌ Webcam not available. Please grant permission.
        </p>
      )}
 
      <div className="relative z-10 w-[326px] h-[434px]">
        <Webcam
          audio={false}
          ref={webcamRef}
          videoConstraints={{
            facingMode: "user",
            width: VIDEO_WIDTH,
            height: VIDEO_HEIGHT,
          }}
          className="border-2 rounded-lg shadow-md absolute top-0 left-0"
          screenshotFormat="image/webp"
          onUserMedia={() => setIsWebcamReady(true)}
          onUserMediaError={(err) => {
            console.error("❌ Webcam error:", err);
            setWebcamError(true);
          }}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 z-20"
          width={VIDEO_WIDTH}
          height={VIDEO_HEIGHT}
        />
      </div>
 
      {!hideFaceNotDetectedMessage && (
        <p className="text-lg font-medium text-white bg-black px-2 py-1 rounded w-80 text-center mt-4 z-10">
          No face detected. Adjust position or lighting.
        </p>
      )}
 
      <div className="mt-4 z-10">
        <button
          onClick={captureAndSendFrames}
          className={`py-2 px-4 rounded border-2 border-black text-white ${
            !isConfidenceHigh || loading
              ? "bg-blue-400 cursor-not-allowed opacity-50"
              : "bg-blue-500 hover:bg-blue-600 hover:scale-110 cursor-pointer transition-transform duration-300"
          }`}
          disabled={!isConfidenceHigh || loading}
        >
          {loading ? "Authenticating..." : "Authenticate"}
        </button>
      </div>
    </div>
  );
};
 
export default FaceAuthentication;
import React, { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import * as faceapi from "face-api.js";
import { io } from "socket.io-client";
import Authentic from "../assets/Authentication.webp";

const FaceAuthentication = () => {
  const [loading, setLoading] = useState(false);
  const [webcamError, setWebcamError] = useState(false);
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const hasAuthenticatedRef = useRef(false);

  const videoConstraints = {
    facingMode: "user",
    width: 326,
    height: 434,
  };

  useEffect(() => {
    const loadModels = async () => {
      await faceapi.nets.ssdMobilenetv1.loadFromUri("/models/ssdMobilenetv1");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models/faceLandmark68Net");
      await faceapi.nets.faceRecognitionNet.loadFromUri("/models/faceRecognitionNet");
    };
    loadModels();

    const socket = io("http://localhost:5000", {
      transports: ["websocket"],
    });

    socket.on("connect", () => console.log("✅ WebSocket Connected to Backend"));

    socket.on("auth_response", (data) => {
      console.log("Response from backend:", data);
      hasAuthenticatedRef.current = true;
      setLoading(false);
    });

    socketRef.current = socket;
  }, []);

  const captureAndSendFrames = async () => {
    setLoading(true);
    hasAuthenticatedRef.current = false;

    const startTime = Date.now();
    const interval = setInterval(async () => {
      const elapsedTime = (Date.now() - startTime) / 1000;

      if (elapsedTime > 5 || hasAuthenticatedRef.current) {
        clearInterval(interval);
        if (!hasAuthenticatedRef.current) setLoading(false); // stop after timeout
        return;
      }

      if (!webcamRef.current) return;

      const screenshot = webcamRef.current.getScreenshot();
      if (!screenshot) {
        setWebcamError(true);
        setLoading(false);
        clearInterval(interval);
        return;
      }

      const byteCharacters = atob(screenshot.split(",")[1]);
      const byteArray = new Uint8Array([...byteCharacters].map((ch) => ch.charCodeAt(0)));
      const imageBlob = new Blob([byteArray], { type: "image/webp" });

      const image = await faceapi.bufferToImage(imageBlob);
      const detection = await faceapi
        .detectSingleFace(image)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        const confidence = (detection.detection.score * 100).toFixed(2);
        drawBoundingBox(
          detection.detection.box.x,
          detection.detection.box.y,
          detection.detection.box.width,
          detection.detection.box.height,
          confidence
        );

        if (confidence >= 90 && socketRef.current && !hasAuthenticatedRef.current) {
          socketRef.current.emit("authenticate", { image: screenshot });
        }
      }
    }, 1000);
  };

  const drawBoundingBox = (x, y, width, height, confidence) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "red";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, width, height);
    ctx.fillStyle = "blue";
    ctx.font = "16px Arial";
    ctx.fillText(`Confidence: ${confidence}%`, x, y - 10);
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
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

      <div className="relative z-10">
        <Webcam
          audio={false}
          ref={webcamRef}
          videoConstraints={videoConstraints}
          className="border-2 rounded-lg shadow-md mt-2"
          screenshotFormat="image/webp"
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 z-20"
          width={326}
          height={434}
        />
      </div>

      <div className="mt-4 z-10 flex flex-col items-center w-full">
        <button
          onClick={captureAndSendFrames}
          className="bg-blue-500 text-white py-2 px-4 rounded border-2 border-black hover:bg-blue-600 hover:scale-110 transition-transform ease-linear duration-300"
          disabled={loading}
        >
          {loading ? "Authenticating..." : "Authenticate"}
        </button>
      </div>
    </div>
  );
};

export default FaceAuthentication;

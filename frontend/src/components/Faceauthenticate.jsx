import React, { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import * as faceapi from "face-api.js";
import Authentic from "../assets/Authentication.webp";

const FaceAuthentication = () => {
  const [isConfidenceHigh, setIsConfidenceHigh] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [webcamError, setWebcamError] = useState(false);
  const [capturedImages, setCapturedImages] = useState([]);
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [socket, setSocket] = useState(null);

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

    // const ws = new WebSocket("ws://your-backend-server");
    // ws.onopen = () => console.log("WebSocket Connected");

    // You can test WebSocket functionality using a free public WebSocket echo server like wss://echo.websocket.org. This lets you send messages and immediately receive them back, confirming that your WebSocket is working.


    const ws = new WebSocket("wss://echo.websocket.org");
    ws.onopen = () => console.log("WebSocket Connected (Mock)");
    ws.onmessage = (event) => console.log("Mock Response:", event.data);
        setSocket(ws);
      }, []);

      const captureAndSendFrames = async () => {
        setLoading(true);
        setStatus("Authenticating in real time...");
      
        let sendingFrames = true;
        const startTime = Date.now();
      
        const interval = setInterval(async () => {
          const elapsedTime = (Date.now() - startTime) / 1000;
          if (elapsedTime > 5) {
            clearInterval(interval);
            setStatus("✅ Frames sent for authentication!");
            setLoading(false);
            return;
          }
      
          if (!webcamRef.current || !sendingFrames) return;
      
          const screenshot = webcamRef.current.getScreenshot();
          if (!screenshot) {
            setWebcamError(true);
            setStatus("❌ Webcam capture failed!");
            setLoading(false);
            return;
          }
      
          const byteCharacters = atob(screenshot.split(",")[1]);
          const byteNumbers = Array.from(byteCharacters, (char) => char.charCodeAt(0));
          const byteArray = new Uint8Array(byteNumbers);
          const imageBlob = new Blob([byteArray], { type: "image/webp" });
      
          const image = await faceapi.bufferToImage(imageBlob);
          const detections = await faceapi.detectSingleFace(image).withFaceLandmarks().withFaceDescriptor();
      
          if (detections) {
            const confidence = (detections.detection.score * 100).toFixed(2);
            drawBoundingBox(detections.detection.box.x, detections.detection.box.y, detections.detection.box.width, detections.detection.box.height, confidence);
      
            setStatus(`Confidence Level: ${confidence}%`);
      
            if (confidence >= 90) {
              setIsConfidenceHigh(true);
              setCapturedImages((prev) => [...prev.slice(-5), screenshot]);
              socket.send(screenshot);
              console.log(`✅ Frame sent (Confidence: ${confidence}%)`);
            } else {
              setIsConfidenceHigh(false);
              console.log(`⏸ Paused (Confidence too low: ${confidence}%)`);
            }
          }
        }, 1000);
      };

      const drawBoundingBox = (x, y, width, height, confidence) => {
        const canvas = canvasRef.current;
        if (!canvas) {
          console.error("Canvas reference is null");
          return;
        }
      
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          console.error("Canvas context is not available");
          return;
        }
      
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      
        ctx.strokeStyle = "red";
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);
      
        ctx.fillStyle = "blue";
        ctx.font = "16px Arial";
        ctx.fillText(`Confidence: ${confidence}%`, x, y - 10);
      };
      

  return (
    <div className="flex flex-col items-center p-6 relative">
      <img src={Authentic} alt="Facial Recognition Background" className="absolute inset-0 w-full h-full object-cover" />
      <h1 className="text-md sm:text-2xl font-bold text-white z-10 text-center">Face Authentication</h1>
      {webcamError && <p className="mt-2 text-red-500 font-medium">❌ Webcam not available. Please grant permission.</p>}
      <div className="relative">
        <Webcam
          audio={false}
          ref={webcamRef}
          videoConstraints={videoConstraints}
          className="border-2 rounded-lg shadow-md mt-4 z-10"
        />
        <canvas ref={canvasRef} className="absolute inset-0" width={326} height={434} />
      </div>
      <div className="mt-4 z-10 flex flex-col items-center w-full">
      <button
        onClick={captureAndSendFrames}
        className={`bg-red-500 text-white py-2 px-4 rounded border-2 border-black hover:bg-blue-600 ${
          !isConfidenceHigh ? "cursor-not-allowed blur-sm" : ""
        } hover:scale-110 transition-transform ease-linear duration-300`}
        disabled={!isConfidenceHigh || loading}
      >
        {loading ? "Authenticating..." : "Authenticate Face"}
      </button>


  <div className="mt-4 w-full flex flex-col items-center">
    <h2 className="text-sm font-semibold text-white">Images Sent to Backend:</h2>
    <div className="flex overflow-x-auto space-x-2 p-2 border rounded-lg max-w-screen-lg">
      {capturedImages.map((img, index) => (
        <img key={index} src={img} alt={`Sent ${index}`} className="w-20 h-20 border rounded object-cover" />
      ))}
    </div>
  </div>

  {loading && <div className="spinner-border text-blue-500 mt-2" role="status"></div>}
</div>
      <p className={`mt-2 ${status.includes("✅") ? "text-green-500" : "text-red-500"}`}>{status}</p>
    </div>
  );
};

export default FaceAuthentication;
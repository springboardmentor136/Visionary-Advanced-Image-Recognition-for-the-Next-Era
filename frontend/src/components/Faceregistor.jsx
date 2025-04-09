import React, { useState, useRef, useEffect } from "react";
import Registor from '../assets/Registration.webp';
import Webcam from "react-webcam";
import * as faceapi from "face-api.js";
import axios from "axios";
import { useNavigate } from "react-router";

const FaceRegistration = () => {
  const [name, setName] = useState("");
  const [isFaceRegistered, setIsFaceRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isImageCaptured, setIsImageCaptured] = useState(false);
  const navigate = useNavigate();

  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  const videoConstraints = {
    facingMode: "user",
    width: 315,
    height: 434,
  };

  useEffect(() => {
    const loadModels = async () => {
      await faceapi.nets.ssdMobilenetv1.loadFromUri("/models/ssdMobilenetv1");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models/faceLandmark68Net");
      await faceapi.nets.faceRecognitionNet.loadFromUri("/models/faceRecognitionNet");
    };
    loadModels();
  }, []);

  useEffect(() => {
    const detectFace = async () => {
      if (!webcamRef.current?.video || isImageCaptured) return;

      const video = webcamRef.current.video;
      const detections = await faceapi
        .detectSingleFace(video)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detections) {
        const detectedConfidence = detections.detection._score * 100;
        setConfidence(detectedConfidence);

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const { box } = detections.detection;
        ctx.strokeStyle = "green";
        ctx.lineWidth = 4;
        const yOffset = 30;
        ctx.strokeRect(box.x, box.y + yOffset, box.width, box.height);

        ctx.fillStyle = "red";
        ctx.font = "16px Arial";
        ctx.fillText(`Confidence: ${detectedConfidence.toFixed(2)}%`, box.x, box.y - 10);

        if (detectedConfidence > 90) {
          setIsFaceDetected(true);
          handleCaptureFace(video, detections.detection.box);
          setIsImageCaptured(true); // ✅ Capture once
        }
      } else {
        setIsFaceDetected(false);
        setConfidence(0);
      }
    };

    const interval = setInterval(detectFace, 100);
    return () => clearInterval(interval);
  }, [isImageCaptured]);

  const handleCaptureFace = (video, box) => {
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");

    tempCanvas.width = box.width;
    tempCanvas.height = box.height;
    tempCtx.drawImage(video, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);

    const croppedFaceImage = tempCanvas.toDataURL("image/png");
    setCapturedImage(croppedFaceImage);
  };

  const handleRegister = async () => {
    if (!name || !capturedImage) {
      alert("Please enter your name and ensure face is detected.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      const file = new File([blob], "captured_face.png", { type: "image/png" });

      const formData = new FormData();
      formData.append("image", file);
      formData.append("name", name);

      const { data } = await axios.post("http://127.0.0.1:5000/register", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("✅ Image uploaded successfully:", data);
      setIsFaceRegistered(true);
      navigate("/");
    } catch (error) {
      console.error("❌ Error uploading image:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen">
      <img
        src={Registor}
        alt="Facial Recognition Background"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="z-10 max-w-xl rounded-lg shadow-md text-center mt-20 sm:mt-8">
        <h1 className="sm:text-2xl bg-white p-5 rounded-full font-bold text-blue-800 sm:w-1/2 m-auto">
          AI Face Registration
        </h1>
        <div className="flex flex-col items-center sm:flex-row lg:gap-x-14 sm:gap-x-8 sm:ml-32">
          <div className="flex flex-col items-center">
            <div className="relative w-[315px] h-[434px]">
              <Webcam
                audio={false}
                ref={webcamRef}
                videoConstraints={videoConstraints}
                className="border-2 rounded-lg shadow-md w-full h-full mt-8 z-10"
              />
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
              />
            </div>
            <p className="text-lg font-medium text-white bg-black bg-opacity-50 px-2 py-1 rounded mt-12 z-10">
              {confidence > 0 ? `Face detected: ${confidence.toFixed(2)}%` : "No face detected"}
            </p>
          </div>

          <div className="flex flex-col space-y-4 w-full max-w-sm relative">
            <input
              type="text"
              placeholder="Enter your name"
              className={`order px-4 py-2 sm:placeholder:text-xs rounded-md mt-3 sm:w-[130px] text-black ${
                isFaceDetected ? "placeholder:text-black" : "placeholder:text-gray-400 bg-gray-100"
              }`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isFaceDetected}
            />
            {name === "" && !loading && confidence > 90 && (
              <div className="flex flex-col items-center mt-1">
                <span className="text-xl text-red-500 -indent-72 sm:-indent-24">^</span>
                <p className="text-red-500 font-medium -indent-40 sm:indent-0">Name is required!</p>
              </div>
            )}
            <button
              onClick={handleRegister}
              className={`py-2 rounded-md mt-2 sm:w-[130px] border-2 border-white text-white ${
                isFaceDetected
                  ? "bg-green-500 cursor-pointer"
                  : "bg-gray-400 cursor-not-allowed opacity-70"
              }`}
              disabled={!isFaceDetected || loading}
            >
              {loading ? "Registering..." : "Register Face"}
            </button>

            {isFaceRegistered && (
              <div className="mt-4">
                <p className="text-white font-semibold text-lg">Registration Complete!</p>
                <p className="text-white">Name: {name}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaceRegistration;

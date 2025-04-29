import React, { useState, useRef, useEffect } from "react";
import Registor from "../assets/bg.jpg"; // Background image
import Webcam from "react-webcam";
import * as faceapi from "face-api.js"; // Face detection library
import axios from "axios"; // For making HTTP requests
import { useNavigate } from "react-router"; // For navigation
import { toast, Toaster } from "react-hot-toast"; // For notifications

// --- Constants ---
const VIDEO_WIDTH = 315; // Webcam resolution width
const VIDEO_HEIGHT = 434; // Webcam resolution height
const DETECTION_CONFIDENCE_THRESHOLD = 90; // Required confidence % to capture face
const API_BASE_URL = 'http://localhost:5000'; // Backend API URL

// --- Component Definition ---
const FaceRegistration = () => {
    // --- State Variables ---
    const [name, setName] = useState(""); // Input field for user's name
    const [role, setRole] = useState("None"); // Selected role ('user' or 'admin')
    const [isFaceRegistered, setIsFaceRegistered] = useState(false); // True after successful registration API call
    const [loading, setLoading] = useState(false); // True when registration API call is in progress
    const [isFaceDetected, setIsFaceDetected] = useState(false); // True if a face is currently detected
    const [isWebcamReady, setIsWebcamReady] = useState(false); // True once webcam stream starts
    const [capturedImage, setCapturedImage] = useState(null); // Stores the base64 cropped face image
    const [isImageCaptured, setIsImageCaptured] = useState(false); // True once a high-confidence face is captured
    const [hideFaceNotDetectedMessage, setHideFaceNotDetectedMessage] = useState(true); // Controls visibility of "Align face" message
    const [webcamError, setWebcamError] = useState(false);

    // --- Refs ---
    const navigate = useNavigate(); // Hook for navigation
    const webcamRef = useRef(null); // Ref for Webcam component
    const canvasRef = useRef(null); // Ref for Canvas overlay
    const detectionIntervalRef = useRef(null); // Ref to store the detection interval ID

    // --- Webcam Video Constraints ---
    const videoConstraints = {
        facingMode: "user", // Use front camera
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
    };

    // --- Effects ---

    // Load face-api.js models on component mount
    useEffect(() => {
        const loadModels = async () => {
            try {
                await faceapi.nets.ssdMobilenetv1.loadFromUri("/models/ssdMobilenetv1");
                console.log("Registration models loaded.");
            } catch (error) {
                console.error("Error loading registration models:", error);
                toast.error("Failed to load face detection models.");
            }
        };
        loadModels();
    }, []); // Empty dependency array ensures this runs only once

    // --- Helper Function ---
    // Checks if detection score meets the threshold
    const isHighConfidence = (score) => (score * 100) >= DETECTION_CONFIDENCE_THRESHOLD;

    // Face Detection and Automatic Capture Loop
    useEffect(() => {
        // Stop the loop if image is already captured or webcam isn't ready
        if (isImageCaptured || !isWebcamReady) {
            if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current); // Clear existing interval if stopping
                detectionIntervalRef.current = null;
            }
            return; // Exit effect
        }

        // Function to perform face detection and capture
        const detectAndCapture = async () => {
            // Ensure webcam and video element are available
            if (!webcamRef.current?.video || webcamRef.current.video.readyState !== 4) {
                console.log("Webcam not ready or video stream ended.");
                return;
            }

            const video = webcamRef.current.video;
            // Configure detection options
            const detectionOptions = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });
            // Detect a single face
            const detection = await faceapi.detectSingleFace(video, detectionOptions);

            const canvas = canvasRef.current;
            if (!canvas) return; // Exit if canvas not ready

            const ctx = canvas.getContext("2d");
            // Match canvas size to the *displayed* video size
            canvas.width = video.clientWidth;
            canvas.height = video.clientHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear previous drawings

            if (detection) { // If face detected
                // Resize detection results to match display size
                const resizedDetection = faceapi.resizeResults(detection, { width: video.clientWidth, height: video.clientHeight });
                const { box, score } = resizedDetection; // Use resized box and original score
                const confidence = (score * 100).toFixed(2);
                const highConfidence = isHighConfidence(score);

                // Draw bounding box
                ctx.strokeStyle = highConfidence ? "limegreen" : "red"; // Green if high confidence, else red
                ctx.lineWidth = 3;
                // ---> Draw box at correct Y position (removed +30) <---
                ctx.strokeRect(box.x, box.y, box.width, box.height);

                // Draw confidence label
                ctx.fillStyle = ctx.strokeStyle; // Match label color to box
                ctx.font = "bold 16px Arial";
                const label = highConfidence ? `Confidence: ${confidence}%` : `Low Confidence: ${confidence}%`;
                // Position label carefully
                const textX = box.x + 5;
                const textY = box.y > 15 ? box.y - 5 : box.y + box.height + 15; // Above or below box
                ctx.fillText(label, textX, textY);

                setIsFaceDetected(true); // Update state: face is detected
                setHideFaceNotDetectedMessage(true); // Hide "Align face" message

                // --- Automatic Capture Logic ---
                // Capture face ONLY if confidence is high AND image hasn't been captured yet
                if (highConfidence && !isImageCaptured) {
                    console.log("High confidence detected, capturing square face...");
                    // Pass the video element and the *resized* box to the capture function
                    handleCaptureSquareFace(video, box);
                    setIsImageCaptured(true); // Set flag to true to stop further captures/detections
                    // Stop the detection interval after successful capture
                    if (detectionIntervalRef.current) {
                        clearInterval(detectionIntervalRef.current);
                        detectionIntervalRef.current = null;
                        console.log("Detection interval stopped after capture.");
                    }
                }
                // --- End Capture Logic ---

            } else { // If no face detected
                setIsFaceDetected(false); // Update state
                setHideFaceNotDetectedMessage(false); // Show "Align face" message
            }
        };

        // Start the detection interval if not already running
        if (!detectionIntervalRef.current) {
            detectionIntervalRef.current = setInterval(detectAndCapture, 500); // Adjust interval as needed (e.g., 500ms)
            console.log("Registration detection interval started.");
        }

        // Cleanup function: Clear interval when component unmounts or dependencies change
        return () => {
            if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current);
                detectionIntervalRef.current = null;
                console.log("Registration detection interval cleared on cleanup.");
            }
        };
    // Rerun effect if capture status or webcam readiness changes
    }, [isImageCaptured, isWebcamReady]);

    // --- Utility Functions ---

    // Capture a square region around the detected face
    const handleCaptureSquareFace = (video, box) => {
        const tempCanvas = document.createElement("canvas");
        const tempCtx = tempCanvas.getContext("2d");

        // Determine square size based on the larger dimension of the box + padding
        const maxDim = Math.max(box.width, box.height);
        const padding = maxDim * 0.2; // 20% padding
        const squareSize = Math.round(maxDim + padding);

        // Calculate center of the detected box
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;

        // Calculate source top-left corner for the square crop
        const sx = Math.round(centerX - squareSize / 2);
        const sy = Math.round(centerY - squareSize / 2);

        // Clamp source coordinates and dimensions to video boundaries
        const finalSx = Math.max(0, sx);
        const finalSy = Math.max(0, sy);
        const finalSWidth = Math.min(video.videoWidth - finalSx, squareSize); // Use videoWidth from video element
        const finalSHeight = Math.min(video.videoHeight - finalSy, squareSize); // Use videoHeight from video element

        // Set destination canvas size
        tempCanvas.width = squareSize;
        tempCanvas.height = squareSize;

        // Draw the source region onto the destination square canvas
        if (finalSWidth > 0 && finalSHeight > 0) {
            tempCtx.drawImage(
                video,
                finalSx, finalSy, finalSWidth, finalSHeight, // Source rectangle
                0, 0, squareSize, squareSize             // Destination rectangle (scales source)
            );
            // Get base64 PNG data from the canvas
            const croppedSquareFaceImage = tempCanvas.toDataURL("image/png");
            setCapturedImage(croppedSquareFaceImage); // Update state with captured image
            console.log("Square face image captured.");
            toast.success("Face captured! Please enter details."); // Notify user
        } else {
            console.error("Calculated source dimensions for square crop are invalid.");
            toast.error("Could not capture face region properly. Please reposition.");
            setIsImageCaptured(false); // Allow retry if capture failed
        }
    };

    // --- Event Handlers ---

    // Handle registration form submission
    const handleRegister = async () => {
        // Validate inputs
        if (!name || !capturedImage || role === "None") {
            toast.error("Please enter name, select role, and ensure face is captured.");
            return;
        }

        setLoading(true); // Show loading indicator

        try {
            // Convert base64 image to Blob, then to File
            const response = await fetch(capturedImage);
            const blob = await response.blob();
            const file = new File([blob], `${name.replace(/\s+/g, '_')}_registration.png`, { type: "image/png" });

            // Create FormData object
            const formData = new FormData();
            formData.append("image", file);
            formData.append("name", name);
            formData.append("role", role);

            // Send POST request to backend
            const { data } = await axios.post(`${API_BASE_URL}/register`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            console.log("✅ Registration successful:", data);
            setIsFaceRegistered(true); // Update state to show success view
            toast.success("Registration Successful!");
            // Redirect to home after delay
            setTimeout(() => navigate("/"), 3000);

        } catch (error) {
            // Handle registration errors
            const errorMsg = error.response?.data?.error || "Error during registration. Please try again.";
            toast.error(`❌ ${errorMsg}`);
            console.error("Error registering user:", error);
            // Consider if user should be allowed to retry capture on error
            // setIsImageCaptured(false);
            // setCapturedImage(null);
        } finally {
            setLoading(false); // Hide loading indicator
        }
    };

    // --- JSX Rendering ---
    return (
        <div className="relative flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4"> {/* Added padding */}
            <Toaster position="top-center" reverseOrder={false} />
            {/* Background Image */}
            <img
                src={Registor}
                alt="Abstract registration background"
                className="absolute inset-0 w-full h-full object-cover z-0 opacity-60"
            />
            {/* Main Content Card */}
            <div
                className={`relative z-10 w-full max-w-4xl rounded-lg shadow-xl text-center p-6 bg-white bg-opacity-80 backdrop-blur-sm mt-10`}
            >
                <h1 className="text-2xl sm:text-3xl font-bold text-blue-800 mb-6">
                    AI Face Registration
                </h1>
                {/* Layout for Webcam and Form */}
                <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12">
                    {/* Webcam Section */}
                    <div className="flex flex-col items-center">
                        <div className="relative w-[315px] h-[434px] border-4 border-blue-400 rounded-lg shadow-md overflow-hidden mb-4">
                            <Webcam
                                audio={false}
                                ref={webcamRef}
                                videoConstraints={videoConstraints}
                                className={`absolute top-0 left-0 w-full h-full object-cover z-10 ${
                                    isImageCaptured ? "filter grayscale blur-sm" : "" // Apply filter after capture
                                }`}
                                screenshotFormat="image/png"
                                onUserMedia={() => setIsWebcamReady(true)} // Set webcam ready state
                                onUserMediaError={() => {toast.error("Webcam access failed."); setWebcamError(true);}}
                            />
                            {/* Canvas Overlay */}
                            <canvas
                                ref={canvasRef}
                                className="absolute top-0 left-0 w-full h-full pointer-events-none z-20"
                            />
                        </div>
                        {/* Informational Messages */}
                        {!hideFaceNotDetectedMessage && !isImageCaptured && (
                            <p className="text-md font-medium text-red-600 bg-yellow-100 px-3 py-1 rounded w-80 text-center">
                                Align face clearly in the frame.
                            </p>
                        )}
                        {isImageCaptured && !isFaceRegistered && (
                            <p className="text-md font-medium text-green-700 bg-green-100 px-3 py-1 rounded w-80 text-center">
                                ✅ Face captured! Enter details below.
                            </p>
                        )}
                         {webcamError && (
                             <p className="text-md font-medium text-red-700 bg-red-100 px-3 py-1 rounded w-80 text-center">
                                ❌ Webcam Error! Check permissions.
                             </p>
                         )}
                    </div>

                    {/* Form Section */}
                    <div className="flex flex-col space-y-4 w-full max-w-xs relative">
                        {isFaceRegistered ? (
                            // Success View
                            <div className="mt-4 text-center p-6 bg-green-100 rounded-lg">
                                <p className="text-green-800 font-bold text-2xl mb-4">Registration Complete!</p>
                                <p className="text-lg font-semibold mb-2">
                                    Name: <span className="font-normal">{name}</span>
                                </p>
                                <p className="text-lg font-semibold">
                                    Role: <span className="font-normal">{role.charAt(0).toUpperCase() + role.slice(1)}</span>
                                </p>
                            </div>
                        ) : (
                            // Form Inputs View
                            <>
                                {/* Name Input */}
                                <label htmlFor="nameInput" className="text-left font-medium text-gray-700">Name:</label>
                                <input
                                    id="nameInput"
                                    type="text"
                                    placeholder="Enter your full name"
                                    className={`w-full px-4 py-2 rounded-md border-2 focus:outline-none focus:border-blue-500 transition duration-200 ${
                                        isImageCaptured
                                        ? "border-gray-300 text-black placeholder-gray-500"
                                        : "border-gray-200 bg-gray-100 text-gray-400 placeholder-gray-400 cursor-not-allowed"
                                    }`}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={!isImageCaptured || loading}
                                />
                                {isImageCaptured && name.trim() === "" && (
                                    <p className="text-red-500 text-sm font-medium text-left -mt-2">Name is required!</p>
                                )}

                                {/* Role Select */}
                                <label htmlFor="roleSelect" className="text-left font-medium text-gray-700">Role:</label>
                                <select
                                    id="roleSelect"
                                    className={`w-full px-4 py-2 rounded-md border-2 focus:outline-none focus:border-blue-500 transition duration-200 ${
                                        isImageCaptured && name.trim() !== ""
                                        ? "border-gray-300 text-black"
                                        : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                                    }`}
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    disabled={!isImageCaptured || name.trim() === "" || loading}
                                >
                                    <option value="None" disabled>-- Select Role --</option>
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                                {isImageCaptured && name.trim() !== "" && role === "None" && (
                                    <p className="text-red-500 text-sm font-medium text-left -mt-2">Role selection is required!</p>
                                )}

                                {/* Register Button */}
                                <button
                                    onClick={handleRegister}
                                    className={`w-full py-2.5 rounded-md font-semibold text-white transition duration-300 mt-4 ${ // Added margin-top
                                        isImageCaptured && name.trim() !== "" && role !== "None" && !loading
                                        ? "bg-green-600 hover:bg-green-700 cursor-pointer shadow-md"
                                        : "bg-gray-400 cursor-not-allowed opacity-70"
                                    }`}
                                    disabled={!isImageCaptured || name.trim() === "" || role === "None" || loading}
                                >
                                    {loading ? "Registering..." : "Register Face"}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FaceRegistration;
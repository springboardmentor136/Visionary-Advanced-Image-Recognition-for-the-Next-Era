import React, { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import * as faceapi from "face-api.js";
import { io } from "socket.io-client";
import axios from 'axios'; 
import Authentic from "../assets/Authentication.webp";
import { toast, Toaster } from "react-hot-toast";
import { useNavigate, useLocation } from "react-router-dom"; 

// --- Constants ---
const VIDEO_WIDTH = 326; 
const VIDEO_HEIGHT = 434; 
const DETECTION_CONFIDENCE_THRESHOLD = 90; 
const API_BASE_URL = 'http://localhost:5000/api'; 
const SOCKET_URL = 'http://localhost:5000'; 

// --- Component Definition ---
const FaceAuthentication = () => {
    // --- State Variables ---
    const [loading, setLoading] = useState(false); // True when waiting for backend response
    const [webcamError, setWebcamError] = useState(false); // True if webcam access fails
    const [userName, setUserName] = useState(null); // Stores authenticated user's name for display
    const [isWebcamReady, setIsWebcamReady] = useState(false); // True once webcam stream starts
    const [isConfidenceHigh, setIsConfidenceHigh] = useState(false); // True if detected face confidence > threshold
    const [hideFaceNotDetectedMessage, setHideFaceNotDetectedMessage] = useState(true); // Controls visibility of "Align face" message
    const [authAction, setAuthAction] = useState('login'); // Current action: 'login' or 'delete'
    const [usernameToDelete, setUsernameToDelete] = useState(''); // Username for delete verification

    // --- Refs ---
    const navigate = useNavigate();
    const location = useLocation();
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const socketRef = useRef(null); 
    const hasAuthenticatedRef = useRef(false); 
    const detectionBoxRef = useRef(null); 
    const imageProcessingTimeoutRef = useRef(null);

    // --- Helper Function ---
    // Checks if detection score meets the threshold
    const isHighConfidence = (score) => (score * 100) >= DETECTION_CONFIDENCE_THRESHOLD;

    // --- Effects ---

    // Load face-api.js models on component mount
    useEffect(() => {
        const loadModels = async () => {
            try {
                // Load the SSD MobileNet v1 model for face detection
                await faceapi.nets.ssdMobilenetv1.loadFromUri("/models/ssdMobilenetv1");
                console.log("Face detection models loaded successfully.");
            } catch (error) {
                console.error("Error loading face detection models:", error);
                toast.error("Failed to load face detection models. Please refresh.");
            }
        };
        loadModels();
    }, []); 

    // Check location state to determine if the action is 'delete'
    useEffect(() => {
        if (location.state?.action === 'delete' && location.state?.username) {
            setAuthAction('delete'); 
            setUsernameToDelete(location.state.username); 
            toast.info(`Verify face to delete account: ${location.state.username}`); 
        } else {
            setAuthAction('login'); // Default action is 'login'
        }
    }, [location.state]); // Rerun if location state changes

    // Main Face Detection and Frame Emission Loop
    useEffect(() => {

        // Stop the loop if webcam isn't ready or if authentication/deletion is already successful
        if (!isWebcamReady || hasAuthenticatedRef.current) {
        
            if (imageProcessingTimeoutRef.current) {
                clearTimeout(imageProcessingTimeoutRef.current);
                imageProcessingTimeoutRef.current = null;
            }
            return; 
        }

        let isProcessing = false; 

        // Async function to perform detection and potentially emit frame
        const detectAndEmit = async () => {
            // Exit if already processing, or webcam/screenshot not available
            if (isProcessing || !webcamRef.current?.video || !webcamRef.current.getScreenshot) return;

            isProcessing = true; // Set processing flag

            const video = webcamRef.current.video;
            // Configure detection options (lower confidence for initial detection)
            const detectionOptions = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.1 });

            // Detect a single face in the current video frame
            const detection = await faceapi.detectSingleFace(video, detectionOptions);
            // ---> DEBUG LOG <---
            console.log("Detection result:", detection); // Log the raw detection result

            const canvas = canvasRef.current;
            if (canvas) { // Ensure canvas is available
                const ctx = canvas.getContext("2d");
                // Match canvas size to the displayed video size
                canvas.width = video.clientWidth;
                canvas.height = video.clientHeight;
                ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear previous drawings

                if (detection) { // If a face is detected
                    // Resize the detection results to match the display size
                    const resizedDetection = faceapi.resizeResults(detection, { width: video.clientWidth, height: video.clientHeight });
                    const { box, score } = resizedDetection; // Get bounding box and confidence score
                    const confidence = (score * 100).toFixed(2); // Format confidence as percentage
                    detectionBoxRef.current = box; // Store the box coordinates
                    const highConfidence = isHighConfidence(score); // Check if confidence meets threshold
                    setIsConfidenceHigh(highConfidence); // Update state
                    setHideFaceNotDetectedMessage(true); // Hide the "Align face" message

                    // Draw the bounding box on the canvas
                    const labelToDraw = userName || (highConfidence ? `Confidence: ${confidence}%` : `Low Confidence: ${confidence}%`);
                    drawBoundingBox(box, labelToDraw, !!userName, highConfidence);

                    // --- Emit Frame Logic ---
                    if (loading && highConfidence && socketRef.current && !hasAuthenticatedRef.current) {
                        const screenshot = webcamRef.current.getScreenshot(); // Capture current frame
                        if (screenshot) {
                            try {
                                // Process screenshot asynchronously
                                const blob = await fetch(screenshot).then(res => res.blob());
                                const image = await faceapi.bufferToImage(blob);
                                // Re-detect face on this specific image for accurate cropping
                                const detectionForCrop = await faceapi.detectSingleFace(image, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.6 }));
                                if (detectionForCrop) {
                                    // Crop the detected face from the image
                                    const croppedFaceDataUrl = cropFaceFromImage(image, detectionForCrop.box);
                                    if (croppedFaceDataUrl) {
                                        // Prepare payload for WebSocket emit
                                        const payload = { image: croppedFaceDataUrl };
                                        if (authAction === 'delete') { // Add action details if deleting
                                            payload.action = 'delete';
                                            payload.username = usernameToDelete;
                                        }
                                        console.log(`Emitting high-confidence frame (Action: ${authAction})...`);
                                        // Emit the 'authenticate' event with the payload
                                        socketRef.current.emit("authenticate", payload);
                                    } else {
                                         console.warn("Cropped face data URL was null."); // Log if cropping failed
                                    }
                                } else {
                                     console.warn("Face not detected in screenshot for cropping."); // Log if re-detection failed
                                }
                            } catch (err) {
                                console.error("Error processing/emitting frame:", err);
                            }
                        }
                    }
                    // --- End of Emit Logic ---

                } else { // If no face is detected
                    setIsConfidenceHigh(false); // Update state
                    setHideFaceNotDetectedMessage(false); // Show the "Align face" message
                    detectionBoxRef.current = null; // Clear stored box
                    drawBoundingBox(null); // Clear the canvas
                }
            }
            isProcessing = false; // Reset processing flag
        };

        // Function to run the detection loop using setTimeout for better control
        const runDetectionLoop = () => {
            // Double-check conditions before running/scheduling next iteration
            if (!isWebcamReady || hasAuthenticatedRef.current) return;
            detectAndEmit().finally(() => {
                // Schedule the next execution only after the current one completes
                imageProcessingTimeoutRef.current = setTimeout(runDetectionLoop, 500); // Adjust interval (e.g., 500ms = 2 FPS)
            });
        };

        runDetectionLoop(); // Start the detection loop

        // Cleanup function: Stop the loop when the component unmounts or conditions change
        return () => {
            if (imageProcessingTimeoutRef.current) {
                clearTimeout(imageProcessingTimeoutRef.current);
                imageProcessingTimeoutRef.current = null;
                console.log("Detection loop stopped.");
            }
        };

    // Dependencies for the detection loop effect
    }, [isWebcamReady, loading, userName, authAction, usernameToDelete]);


    // Function to send login time to the backend API
    const logLoginTime = async (loggedInUsername) => {
        const now = new Date();
        // Format date as YYYY-MM-DD (compatible with most DBs)
        const date = now.toISOString().split('T')[0];
        // Format time as HH:MM:SS
        const time = now.toTimeString().split(' ')[0];
        try {
            // Make POST request to the log-login endpoint
            await axios.post(`${API_BASE_URL}/log-login`, {
                username: loggedInUsername,
                date: date,
                time: time
            });
            console.log(`Login time logged for user: ${loggedInUsername}`);
        } catch (error) {
            console.error("Error logging login time:", error);
            // Non-critical error, usually just log it
        }
    };

    // Setup WebSocket connection and event listeners
    useEffect(() => {
        // Prevent creating multiple socket connections
        if (socketRef.current) return;

        // Establish WebSocket connection
        const socket = io(SOCKET_URL, {
            transports: ["websocket"], // Use WebSocket transport
            reconnectionAttempts: 5, // Limit retries on disconnect
            timeout: 10000, // Connection attempt timeout
        });

        // --- Socket Event Handlers ---
        socket.on("connect", () => {
            console.log(`✅ WebSocket connected (ID: ${socket.id})`);
            // Optionally clear errors on successful connection
        });

        socket.on("connect_error", (err) => {
            console.error("❌ WebSocket connection error:", err.message);
            toast.error("Cannot connect to authentication server. Please check backend.");
            setLoading(false); // Stop loading if connection fails
        });

        // Handle 'auth_response' from backend
        socket.on("auth_response", (data) => {
            console.log("🧠 Auth response:", data);

            // Stop loading ONLY if auth failed or unknown
            // Success case handles loading implicitly via hasAuthenticatedRef
            if (data.error || (data.name && data.name.toLowerCase() === "unknown")) {
                setLoading(false); // Stop loading
                hasAuthenticatedRef.current = false; // Allow user to retry
                toast.error(data.error || "Unrecognized face. Please try again.");
                // Redraw box with failure/unknown status
                if (detectionBoxRef.current) drawBoundingBox(detectionBoxRef.current, data.error ? "Failed" : "Unknown", false, false);
            } else if (data.name) {
                // --- Successful Authentication ---
                hasAuthenticatedRef.current = true; // <<< Stop detection loop emission
                setLoading(false); // Explicitly stop loading state
                setUserName(data.name); // Display the authenticated username
                // Redraw box with success status
                if (detectionBoxRef.current) drawBoundingBox(detectionBoxRef.current, data.name, true, true);
                toast.success(`Authenticated as ${data.name}`);

                // Store user details in localStorage
                localStorage.setItem("authenticatedUser", data.name);
                localStorage.setItem("userRole", data.role || 'user'); // Default to 'user' if role missing

                // Log the login time asynchronously
                logLoginTime(data.name);

                // Navigate to the appropriate dashboard after a delay
                setTimeout(() => {
                    if (data.role === "admin") {
                        navigate("/admin");
                    } else {
                        navigate("/user-dashboard");
                    }
                }, 1500); // Delay for user to see success message
            }
        });

        // Handle 'delete_response' from backend
        socket.on("delete_response", (data) => {
            console.log("🗑️ Delete response:", data);
            setLoading(false); // Stop loading

            if (data.status === 'deleted') {
                // --- Successful Deletion ---
                hasAuthenticatedRef.current = true; // Stop detection loop
                toast.success(`Account ${data.name} deleted successfully.`);
                // Clear user data from localStorage
                localStorage.removeItem('authenticatedUser');
                localStorage.removeItem('userRole');
                // Redirect to home page after a delay
                setTimeout(() => navigate("/"), 2000);
            } else {
                // --- Deletion Failed ---
                hasAuthenticatedRef.current = false; // Allow user to retry verification
                toast.error(data.error || "Account deletion failed.");
                // Redraw box with failure status
                if (detectionBoxRef.current) drawBoundingBox(detectionBoxRef.current, "Verification Failed", false, false);
            }
        });

        // Store the socket instance in the ref
        socketRef.current = socket;

        // Cleanup function: Disconnect socket when component unmounts
        return () => {
            if (socketRef.current) {
                console.log("🔌 Disconnecting WebSocket");
                socketRef.current.disconnect();
                socketRef.current = null; // Clear the ref
            }
        };
    }, [navigate]); // Dependency array includes navigate

    // --- Utility Functions ---

    // Crop face from a larger image based on bounding box
    const cropFaceFromImage = (image, box) => {
        const tempCanvas = document.createElement("canvas");
        const ctx = tempCanvas.getContext("2d");
        // Ensure coordinates are valid and within image bounds
        const x = Math.max(0, box.x);
        const y = Math.max(0, box.y);
        const width = Math.min(image.width - x, box.width);
        const height = Math.min(image.height - y, box.height);

        if (width <= 0 || height <= 0) { // Check for invalid dimensions
             console.warn("Invalid box dimensions for cropping:", {x, y, width, height});
             return null;
        }

        tempCanvas.width = width;
        tempCanvas.height = height;
        // Draw the cropped part onto the temporary canvas
        ctx.drawImage(image, x, y, width, height, 0, 0, width, height);
        // Return as base64 WebP image data
        return tempCanvas.toDataURL("image/webp", 0.9); // Quality 0.9
    };

    // Draw the bounding box and label on the overlay canvas
    const drawBoundingBox = (box, label = "", isAuthenticated = false, isConfident = false) => {
        
        const canvas = canvasRef.current;
        if (!canvas) return; // Ensure canvas ref is valid
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear previous drawings

        if (!box) return; // Don't draw if no box provided

        // Set box color based on state
        ctx.strokeStyle = isAuthenticated ? "limegreen" : (isConfident ? "orange" : "red");
        ctx.lineWidth = 3; // Box line thickness
        // Draw the rectangle
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        // Set label style
        // ---> Reverted back to original color logic (remove yellow override) <---
        ctx.fillStyle = ctx.strokeStyle; // Match text color to box color
        // ctx.fillStyle = "yellow"; // <-- REMOVED/COMMENTED OUT yellow override
        // ---> End Revert <---

        ctx.font = "bold 18px Arial"; // Label font
        // Calculate label position (above box, or below if too close to top)
        const textX = box.x + 5; // Slight offset from box edge
        const textY = box.y > 20 ? box.y - 10 : box.y + box.height + 20;
        // Draw the label text
        ctx.fillText(label, textX, textY);
    };

    // --- Event Handlers ---

    // Handle the click event of the main action button
    const handleAuthenticateClick = () => {
        // Prevent action if webcam not ready, already authenticated/deleted, or already loading
        if (!isWebcamReady || hasAuthenticatedRef.current || loading) {
            return;
        }
        // Optionally check confidence here again, or rely on the loop's check
        if (!isConfidenceHigh) {
             toast.error("Face confidence too low or not detected clearly. Please align.");
             return;
        }

        setUserName(null); // Clear any previously displayed username
        hasAuthenticatedRef.current = false; // Reset auth success flag for this attempt
        setLoading(true); // <<<--- Start the loading state, which enables frame emission in the loop
        console.log(`Authentication process started (Action: ${authAction}). Emitting high-confidence frames...`);
        // The useEffect loop will now start sending frames if confidence is high
    };

    // --- JSX Rendering ---
    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-gray-800">
            <Toaster position="top-center" reverseOrder={false} />
            {/* Background Image */}
            <img
                src={Authentic}
                alt="Abstract background"
                className="absolute inset-0 w-full h-full object-cover z-0 opacity-40"
            />
            {/* Main Content Container */}
            <div className="relative z-10 flex flex-col items-center p-4"> {/* Added padding */}
                {/* Dynamic Heading */}
                <h1 className="text-2xl sm:text-3xl font-bold text-white text-center mb-4 shadow-text">
                    {authAction === 'delete' ? 'Verify Face to Delete Account' : 'Face Authentication'}
                </h1>

                {/* Webcam Error Message */}
                {webcamError && (
                    <p className="text-red-400 font-medium z-10 bg-black bg-opacity-50 px-3 py-1 rounded mb-2">
                        ❌ Webcam not available. Please grant permission.
                    </p>
                )}

                {/* Webcam and Canvas Container */}
                <div className="relative w-[326px] h-[434px] border-4 border-blue-500 rounded-lg shadow-lg overflow-hidden mb-4"> {/* Added margin-bottom */}
                    <Webcam
                        audio={false}
                        ref={webcamRef}
                        videoConstraints={{
                            facingMode: "user",
                            width: VIDEO_WIDTH,
                            height: VIDEO_HEIGHT,
                        }}
                        className="absolute top-0 left-0 w-full h-full object-cover"
                        screenshotFormat="image/webp"
                        onUserMedia={() => { // When webcam starts successfully
                            console.log("Webcam ready");
                            setIsWebcamReady(true);
                            setWebcamError(false);
                        }}
                        onUserMediaError={(err) => { // When webcam access fails
                            console.error("❌ Webcam error:", err);
                            setWebcamError(true);
                            toast.error("Webcam access denied or unavailable.");
                        }}
                    />
                    {/* Canvas for drawing overlays */}
                    <canvas
                        ref={canvasRef}
                        className="absolute top-0 left-0 w-full h-full z-20 pointer-events-none"
                    />
                </div>

                {/* Face Not Detected / Low Confidence Message */}
                {!hideFaceNotDetectedMessage && !loading && (
                    <p className="text-lg font-medium text-yellow-300 bg-black bg-opacity-60 px-3 py-1 rounded w-80 text-center z-10">
                        Align face in the frame.
                    </p>
                )}

                {/* Action Button Area */}
                <div className="mt-6 z-10 text-center"> {/* Centered button area */}
                    <button
                        onClick={handleAuthenticateClick}
                        className={`py-3 px-6 rounded-lg border-2 border-white font-semibold text-lg transition-all duration-300 w-64 ${ // Fixed width for button
                            !isWebcamReady || loading
                                ? "bg-gray-500 text-gray-300 cursor-not-allowed opacity-70" // Disabled state
                                : "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 hover:scale-105 cursor-pointer shadow-md" // Enabled state
                        }`}
                        // Disable button if webcam isn't ready or if currently loading
                        disabled={!isWebcamReady || loading}
                    >
                        {loading ? (authAction === 'delete' ? "Verifying..." : "Authenticating...") : (authAction === 'delete' ? "Verify to Delete" : "Authenticate")}
                    </button>
                    {/* Guidance message if confidence is low */}
                    {isWebcamReady && !loading && !isConfidenceHigh &&
                        <p className="text-yellow-400 text-sm mt-2">Align face or improve lighting.</p>
                    }
                </div>
            </div>
        </div>
    );
};

export default FaceAuthentication;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast, Toaster } from 'react-hot-toast'; // Import toast for notifications

// Define your backend API base URL
const API_BASE_URL = 'http://localhost:5000/api'; // Adjust if your backend runs elsewhere

const UserDashboard = () => {
    const navigate = useNavigate();
    const [userName, setUserName] = useState('');
    const [loginLogs, setLoginLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const storedUserName = localStorage.getItem('authenticatedUser');
        if (!storedUserName) {
            navigate('/');
            return;
        }
        setUserName(storedUserName);

        // Fetch login logs for this specific user
        const fetchLogs = async () => {
            setIsLoading(true);
            try {
                // --- Actual API Call ---
                const response = await axios.get(`${API_BASE_URL}/login-logs`, {
                    params: {
                        username: storedUserName // Send username as query parameter
                    }
                });
                // Sort logs by date and time, newest first (optional but good UX)
                const sortedLogs = response.data.sort((a, b) => {
                    const dateTimeA = new Date(`${a.date.split('-').reverse().join('-')}T${a.time}`);
                    const dateTimeB = new Date(`${b.date.split('-').reverse().join('-')}T${b.time}`);
                    return dateTimeB - dateTimeA; // Sort descending
                });
                setLoginLogs(sortedLogs);
                // --- End API Call ---

            } catch (error) {
                console.error("Error fetching login logs:", error);
                toast.error("Could not fetch login history."); // Show error notification
                setLoginLogs([]); // Set logs to empty on error
            } finally {
                setIsLoading(false);
            }
        };

        fetchLogs();

    }, [navigate]); // Dependency array includes navigate

    const handleLogout = () => {
        localStorage.removeItem('authenticatedUser');
        localStorage.removeItem('userRole');
        toast.success("Logged out successfully!");
        navigate('/');
    };

    const handleDeleteAccountRequest = () => {
        // Navigate to authentication page for re-verification
        // Pass necessary info in state
        navigate('/authenticate', { state: { action: 'delete', username: userName } });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 p-6 flex flex-col items-center relative">
            <Toaster position="top-center" /> {/* Add Toaster for notifications */}
            {/* Logout and Delete Buttons */}
            <div className="absolute top-4 right-4 flex space-x-3 z-10">
                <button
                    onClick={handleDeleteAccountRequest}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition duration-200"
                >
                    Delete Account
                </button>
                <button
                    onClick={handleLogout}
                    className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition duration-200"
                >
                    Logout
                </button>
            </div>

            {/* Heading */}
            <h1 className="text-3xl font-bold text-blue-800 mt-16 mb-6 text-center"> {/* Adjusted margin-top */}
                User Dashboard
            </h1>
            <p className="text-xl text-purple-700 mb-10">Welcome, {userName}!</p>

            {/* Login Logs Section */}
            <div className="w-full max-w-3xl bg-white shadow-lg rounded-lg p-6">
                <h2 className="text-2xl font-semibold text-gray-700 mb-4">Your Login History</h2>
                {isLoading ? (
                    <p className="text-center text-gray-500">Loading logs...</p>
                ) : loginLogs.length > 0 ? (
                    <div className="overflow-x-auto"> {/* Added for smaller screens */}
                        <table className="w-full table-auto border-collapse min-w-[400px]"> {/* Added min-width */}
                            <thead>
                                <tr className="bg-blue-100 text-blue-800">
                                    <th className="px-4 py-2 text-left border-b-2 border-blue-200">Login Date</th>
                                    <th className="px-4 py-2 text-left border-b-2 border-blue-200">Login Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loginLogs.map((log, index) => (
                                    // Use a combination of fields for a more unique key if possible
                                    <tr key={`${log.date}-${log.time}-${index}`} className="hover:bg-purple-50 border-b border-gray-200">
                                        <td className="px-4 py-2 whitespace-nowrap">{log.date}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{log.time}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-center text-gray-500">No login history found.</p>
                )}
            </div>
        </div>
    );
};

export default UserDashboard;
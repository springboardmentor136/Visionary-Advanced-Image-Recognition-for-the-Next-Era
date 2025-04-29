import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast, Toaster } from 'react-hot-toast'; // Import toast

// Define your backend API base URL
const API_BASE_URL = 'http://localhost:5000/api'; // Adjust if needed

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState('users'); // 'users' or 'logs'
    const [registeredUsers, setRegisteredUsers] = useState([]);
    const [loginLogs, setLoginLogs] = useState([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);

    // Fetch Registered Users on component mount
    useEffect(() => {
        const fetchUsers = async () => {
            setIsLoadingUsers(true);
            try {
                // --- Actual API Call ---
                const response = await axios.get(`${API_BASE_URL}/users`);
                // Sort users alphabetically by name (optional)
                const sortedUsers = response.data.sort((a, b) => a.name.localeCompare(b.name));
                setRegisteredUsers(sortedUsers);
                // --- End API Call ---
            } catch (error) {
                console.error("Error fetching registered users:", error);
                toast.error("Could not fetch registered users.");
                setRegisteredUsers([]); // Clear users on error
                // Handle specific errors like 401/403 Unauthorized later if needed
            } finally {
                setIsLoadingUsers(false);
            }
        };
        fetchUsers();
    }, []); // Runs only once on mount

    // Fetch Login Logs when viewMode changes to 'logs'
    useEffect(() => {
        // Only fetch if viewMode is 'logs' and logs haven't been loaded yet or need refresh
        if (viewMode === 'logs') {
             const fetchLogs = async () => {
                setIsLoadingLogs(true);
                try {
                    // --- Actual API Call ---
                    // Fetch all logs (no username filter)
                    const response = await axios.get(`${API_BASE_URL}/login-logs`);
                     // Sort logs by date and time, newest first
                    const sortedLogs = response.data.sort((a, b) => {
                        // Assuming date format DD-MM-YYYY from backend register route
                        const dateTimeA = new Date(`${a.date.split('-').reverse().join('-')}T${a.time}`);
                        const dateTimeB = new Date(`${b.date.split('-').reverse().join('-')}T${b.time}`);
                        return dateTimeB - dateTimeA; // Sort descending
                    });
                    setLoginLogs(sortedLogs);
                    // --- End API Call ---
                } catch (error) {
                    console.error("Error fetching login logs:", error);
                    toast.error("Could not fetch login logs.");
                    setLoginLogs([]); // Clear logs on error
                } finally {
                    setIsLoadingLogs(false);
                }
            };
            fetchLogs();
        }
    }, [viewMode]); // Re-run when viewMode changes


    const handleToggleView = () => {
        setViewMode(prevMode => (prevMode === 'users' ? 'logs' : 'users'));
    };

    const handleDeleteUser = async (username) => {
        // Prevent deleting own admin account? (Optional check)
        // const currentUser = localStorage.getItem('authenticatedUser');
        // if (username === currentUser) {
        //     toast.error("You cannot delete your own account from the admin panel.");
        //     return;
        // }

        if (window.confirm(`Are you sure you want to delete user: ${username}? This action cannot be undone.`)) {
            try {
                // --- Actual API Call ---
                const response = await axios.delete(`${API_BASE_URL}/users/${username}`);
                toast.success(response.data.message || `User ${username} deleted successfully.`);
                // --- End API Call ---

                // Update local state to remove the user immediately
                setRegisteredUsers(prevUsers => prevUsers.filter(user => user.name !== username));

            } catch (error) {
                console.error(`Error deleting user ${username}:`, error);
                const errorMessage = error.response?.data?.error || `Failed to delete user ${username}.`;
                toast.error(errorMessage);
            }
        }
    };

     const handleLogout = () => {
        localStorage.removeItem('authenticatedUser');
        localStorage.removeItem('userRole');
        toast.success("Admin logged out successfully!");
        navigate('/');
    };


    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 p-6 flex flex-col items-center relative">
            <Toaster position="top-center" /> {/* Add Toaster */}
             {/* Logout Button */}
            <div className="absolute top-4 right-4 z-10">
                 <button
                    onClick={handleLogout}
                    className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition duration-200"
                >
                    Logout
                </button>
            </div>

            {/* Heading */}
            <h1 className="text-3xl font-bold text-purple-800 mt-16 mb-8 text-center"> {/* Adjusted margin-top */}
                Admin Dashboard
            </h1>

            {/* Main Content Area */}
            <div className="w-full max-w-5xl bg-white shadow-xl rounded-lg p-6">
                {/* Header with Toggle Button */}
                <div className="flex flex-wrap justify-between items-center mb-6 gap-4"> {/* Added flex-wrap and gap */}
                    <h2 className="text-2xl font-semibold text-gray-700">
                        {viewMode === 'users' ? 'Registered Users' : 'User Login History'}
                    </h2>
                    <button
                        onClick={handleToggleView}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition duration-200"
                    >
                        {viewMode === 'users' ? 'Show Logs' : 'Show Users'}
                    </button>
                </div>

                {/* Conditional Table Rendering */}
                {viewMode === 'users' ? (
                    // Registered Users Table
                    <div className="overflow-x-auto">
                        {isLoadingUsers ? (
                            <p className="text-center text-gray-500 py-4">Loading users...</p>
                        ) : registeredUsers.length > 0 ? (
                            <table className="w-full table-auto border-collapse min-w-[700px]"> {/* Added min-width */}
                                <thead>
                                    <tr className="bg-purple-100 text-purple-800">
                                        <th className="px-4 py-3 text-left border-b-2 border-purple-200">Username</th>
                                        <th className="px-4 py-3 text-left border-b-2 border-purple-200">Reg. Date</th>
                                        <th className="px-4 py-3 text-left border-b-2 border-purple-200">Reg. Time</th>
                                        <th className="px-4 py-3 text-left border-b-2 border-purple-200">Role</th>
                                        <th className="px-4 py-3 text-left border-b-2 border-purple-200">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {registeredUsers.map((user) => (
                                        <tr key={user.name} className="hover:bg-blue-50 border-b border-gray-200">
                                            <td className="px-4 py-2 whitespace-nowrap">{user.name}</td>
                                            <td className="px-4 py-2 whitespace-nowrap">{user.registration_date}</td>
                                            <td className="px-4 py-2 whitespace-nowrap">{user.registration_time}</td>
                                            <td className="px-4 py-2 whitespace-nowrap">{user.role}</td>
                                            <td className="px-4 py-2 whitespace-nowrap">
                                                <button
                                                    onClick={() => handleDeleteUser(user.name)}
                                                    className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                                    // Optional: Disable delete for the currently logged-in admin
                                                    // disabled={user.name === localStorage.getItem('authenticatedUser')}
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-center text-gray-500 py-4">No registered users found.</p>
                        )}
                    </div>
                ) : (
                    // Login Logs Table
                     <div className="overflow-x-auto">
                        {isLoadingLogs ? (
                            <p className="text-center text-gray-500 py-4">Loading logs...</p>
                        ) : loginLogs.length > 0 ? (
                            <table className="w-full table-auto border-collapse min-w-[500px]"> {/* Added min-width */}
                                <thead>
                                    <tr className="bg-blue-100 text-blue-800">
                                        <th className="px-4 py-3 text-left border-b-2 border-blue-200">Username</th>
                                        <th className="px-4 py-3 text-left border-b-2 border-blue-200">Login Date</th>
                                        <th className="px-4 py-3 text-left border-b-2 border-blue-200">Login Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loginLogs.map((log, index) => (
                                        <tr key={`${log.name}-${log.date}-${log.time}-${index}`} className="hover:bg-purple-50 border-b border-gray-200">
                                            <td className="px-4 py-2 whitespace-nowrap">{log.name}</td>
                                            <td className="px-4 py-2 whitespace-nowrap">{log.date}</td>
                                            <td className="px-4 py-2 whitespace-nowrap">{log.time}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-center text-gray-500 py-4">No login logs found.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
import React from "react";
import { Link } from "react-router-dom";
import Infosys from '../assets/infosys.webp'
import Particle from "../Particle/Particle"; // Assuming Particle component exists
import Facego from '../assets/facego.webp';

const HomePage = () => {
  return (
    <div className="relative min-h-screen bg-blue-700"> {/* Original background */}
      <div className="absolute top-0 left-0 w-full h-full z-0">
        <Particle />
      </div>

      {/* Original Header */}
      <div className="flex">
        <img src={Facego}
          alt="FaceGo Logo" // Added alt text
          className="w-24 sm:w-40 relative top-5 left-10"
        />
        <h1 className="relative top-5 right-5 sm:right-16 sm:font-bold sm:text-4xl text-red-500">Face<span className="text-red-500 font-normal">GO</span></h1>
      </div>

      {/* Original Main Content Structure */}
      <div className="flex flex-col items-center justify-center relative z-20">
        <h1 className="text-3xl mt-10 font-bold mb-6 bg-gradient-to-r from-yellow-400 to-yellow-700 text-transparent bg-clip-text text-center">
          Welcome to Face Recognition Web
        </h1>
        <div className="flex md:flex-row flex-col justify-around items-center w-full px-4">
          {/* Original Left Section */}
          <div className="flex-col mb-4">
            <img
              src="https://faceio.net/images/select.svg"
              alt="rectangle-icon"
              className="w-32 sm:w-40 m-auto"
            />
            <h1 className="font-bold text-3xl text-white text-center m-auto md:w-[550px]">
              Visionary-Advance Image Recognition for the Next Era
            </h1>
            <img src={Infosys} alt='infosys-logo' className="w-60 m-auto bg-white rounded-full mt-2"/>
          </div>

          {/* Original Right Section */}
          <div className="flex flex-col items-center">
            <img
              src="https://cdn.faceio.net/extract-face.svg"
              alt="Face-icon"
              className="sm:w-80" // Original size
            />
            {/* Updated Buttons Section (Only text and removal changes) */}
            <div className="flex-col lg:flex-row gap-y-10 mt-10 mb-10 space-x-4 flex justify-center">
              <Link
                to="/register"
                className="inline-block bg-red-500 text-white text-center border-2 border-white px-4 py-2 rounded hover:bg-red-600 hover:scale-110 transition-transform duration-300 ease-linear" // Original styling
              >
                Go to Register
              </Link>
              <Link
                to="/authenticate" // Link remains the same
                className="inline-block bg-green-500 text-white px-4 py-2 border-2 border-white rounded hover:bg-green-600 hover:scale-110 transition-transform duration-300 ease-linear" // Original styling
              >
                Login {/* Text changed here */}
              </Link>
              {/* Attendance button removed */}
              {/*
              <Link
                to="/attendance"
                className="inline-block bg-indigo-500 text-white px-4 py-2 border-2 border-white rounded hover:bg-indigo-600 hover:scale-110 transition-transform duration-300 ease-linear"
              >
                Go to Attendance
              </Link>
              */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
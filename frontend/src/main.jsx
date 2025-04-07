import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import "./index.css";
import React from 'react';

import {createBrowserRouter, createRoutesFromElements,RouterProvider,Route, Router } from 'react-router-dom';
import HomePage from './components/Home.jsx';
import FaceRegistration from './components/Faceregistor.jsx';
import FaceAuthentication from './components/Faceauthenticate.jsx'


const router=createBrowserRouter(
  createRoutesFromElements(
    <>
    {/* <Route path="*" element={<NotFound />} /> */}
    <Route path="/" element={<HomePage/>} />
    <Route path="/register" element={<FaceRegistration />} />
    <Route path="/authenticate" element={<FaceAuthentication />} />
    </>
  )
)



createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router}/>
  </StrictMode>
)

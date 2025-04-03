import {createBrowserRouter, createRoutesFromElements,RouterProvider,Route, Router } from 'react-router-dom';
import HomePage from './FaceRecorgnition/Home.jsx';
import FaceRegistration from './FaceRecorgnition/Faceregistor.jsx';
import FaceAuthentication from './FaceRecorgnition/Faceauthenticate.jsx'


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

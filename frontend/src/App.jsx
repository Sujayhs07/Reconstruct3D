import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import NewProject from './pages/NewProject';
import ProjectHistory from './pages/ProjectHistory';
import ProjectWorkspace from './pages/ProjectWorkspace';
import ImageAcquisition from './pages/ImageAcquisition';
import ImageAnalysis from './pages/ImageAnalysis';
import ReconstructionStudio from './pages/ReconstructionStudio';
import ModelViewerPage from './pages/ModelViewerPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0f1115] text-[#e6edf3] flex flex-col font-sans">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/new" element={<NewProject />} />
            <Route path="/history" element={<ProjectHistory />} />

            {/* Project Workspace Routes */}
            <Route path="/projects/:id" element={<ProjectWorkspace />}>
              <Route index element={<Navigate to="images" replace />} />
              <Route path="images" element={<ImageAcquisition />} />
              <Route path="analysis" element={<ImageAnalysis />} />
              <Route path="reconstruct" element={<ReconstructionStudio />} />
              <Route path="viewer" element={<ModelViewerPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

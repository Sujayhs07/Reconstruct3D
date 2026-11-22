import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import Dashboard from './pages/Dashboard';
import NewProject from './pages/NewProject';
import ProjectHistory from './pages/ProjectHistory';
import SettingsPage from './pages/SettingsPage';
import AboutPage from './pages/AboutPage';
import ProjectWorkspace from './pages/ProjectWorkspace';
import ImageAcquisition from './pages/ImageAcquisition';
import ImageAnalysis from './pages/ImageAnalysis';
import ReconstructionStudio from './pages/ReconstructionStudio';
import ModelViewerPage from './pages/ModelViewerPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#07080d] text-[#e6edf3] flex font-sans selection:bg-purple-600 selection:text-white">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Right Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          <TopHeader />
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/new" element={<NewProject />} />
              <Route path="/history" element={<ProjectHistory />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/about" element={<AboutPage />} />

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
      </div>
    </BrowserRouter>
  );
}

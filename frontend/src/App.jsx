import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import MobileBottomNav from './components/MobileBottomNav';
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
import MobileARViewer from './pages/MobileARViewer';

export default function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <BrowserRouter>
      <Routes>
        {/* Fullscreen Mobile AR Viewer Routes */}
        <Route path="/ar/:id" element={<MobileARViewer />} />
        <Route path="/projects/:id/ar" element={<MobileARViewer />} />

        {/* Regular Application Layout with Navigation */}
        <Route
          path="/*"
          element={
            <div className="w-full flex-1 min-h-screen bg-[#07080d] text-[#e6edf3] flex font-sans selection:bg-purple-600 selection:text-white">
              {/* Left Sidebar (Desktop persistent + Mobile slide-out drawer) */}
              <Sidebar
                mobileOpen={mobileMenuOpen}
                onClose={() => setMobileMenuOpen(false)}
              />

              {/* Right Main Content Area */}
              <div className="flex-1 flex flex-col min-w-0 w-full min-h-screen">
                <TopHeader onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)} />
                <main className="flex-1 w-full overflow-y-auto pb-20 md:pb-6">
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
                      <Route path="models" element={<ModelViewerPage />} />
                      <Route path="viewer" element={<ModelViewerPage />} />
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>
              </div>

              {/* Mobile Bottom Navigation Bar for one-tap thumb navigation */}
              <MobileBottomNav />
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

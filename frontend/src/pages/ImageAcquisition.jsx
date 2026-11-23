import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext, useSearchParams, useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  Camera,
  Trash2,
  ArrowRight,
  Image as ImageIcon
} from 'lucide-react';
import DropzoneUpload from '../components/DropzoneUpload';
import WebcamCapture from '../components/WebcamCapture';
import CoverageRadar from '../components/CoverageRadar';
import { getProjectImages, deleteImage } from '../api/client';

export default function ImageAcquisition() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { project, reloadProject } = useOutletContext();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState(searchParams.get('method') === 'webcam' ? 'webcam' : 'upload');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadImages = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const res = await getProjectImages(id);
      setImages(res.data);
    } catch (err) {
      console.error('Failed to load project images:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    loadImages(true);
  }, [id]);

  const handleDeleteImage = async (imgId) => {
    try {
      await deleteImage(id, imgId);
      loadImages();
      reloadProject();
    } catch (err) {
      alert('Failed to delete image: ' + err.message);
    }
  };

  const handleImagesAdded = () => {
    loadImages();
    reloadProject();
  };

  return (
    <div className="space-y-6 select-none">
      {/* Acquisition Tabs */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'upload'
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-sm'
              : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Upload Image Files</span>
        </button>

        <button
          onClick={() => setActiveTab('webcam')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'webcam'
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-sm'
              : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Live Camera Capture</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'upload' ? (
        <DropzoneUpload projectId={id} onImagesUploaded={handleImagesAdded} />
      ) : (
        <WebcamCapture projectId={id} onImagesAdded={handleImagesAdded} />
      )}

      {/* 360° Angle Coverage Radar & Gemini Guidance */}
      {images.length > 0 && (
        <CoverageRadar
          projectId={id}
          imagesCount={images.length}
          onCaptureRequested={() => setActiveTab('webcam')}
          onProceedToReconstruct={() => navigate(`/projects/${id}/reconstruct`)}
        />
      )}

      {/* Project Image Gallery */}
      <div className="rounded-xl surface-panel border border-white/[0.08] p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center space-x-2 m-0 tracking-tight">
              <ImageIcon className="w-4 h-4 text-zinc-400" />
              <span>Project Photographs ({images.length})</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Images captured and validated for AI 3D Reconstruction and feature matching.
            </p>
          </div>

          {images.length >= 4 && (
            <button
              onClick={() => navigate(`/projects/${id}/analysis`)}
              className="btn-primary px-3.5 py-1.5 text-xs flex items-center space-x-1.5"
            >
              <span>Analyze Quality & SIFT</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {images.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 font-mono text-xs">
            No photographs uploaded yet. Drag & drop image files above or use live camera capture.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {images.map((img) => (
              <div
                key={img.id}
                className="group relative rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 aspect-square flex flex-col justify-between"
              >
                <img
                  src={img.file_path}
                  alt={img.filename}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-between">
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleDeleteImage(img.id)}
                      className="p-1 rounded bg-rose-950/80 text-rose-300 hover:text-white hover:bg-rose-800 transition-colors"
                      title="Delete photograph"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-[10px] font-mono text-zinc-300 truncate">
                    <div className="font-medium truncate text-white">{img.filename}</div>
                    <div className="text-zinc-400">{img.width}x{img.height} • {Math.round(img.file_size / 1024)} KB</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

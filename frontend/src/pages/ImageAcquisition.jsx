import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext, useSearchParams, useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  Camera,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Eye,
  Sliders,
  Image as ImageIcon
} from 'lucide-react';
import DropzoneUpload from '../components/DropzoneUpload';
import WebcamCapture from '../components/WebcamCapture';
import { getProjectImages, deleteImage } from '../api/client';

export default function ImageAcquisition() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { project, reloadProject } = useOutletContext();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState(searchParams.get('method') === 'webcam' ? 'webcam' : 'upload');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadImages = async () => {
    try {
      setLoading(true);
      const res = await getProjectImages(id);
      setImages(res.data);
    } catch (err) {
      console.error('Failed to load project images:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImages();
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
    <div className="space-y-6">
      {/* Acquisition Tabs */}
      <div className="flex items-center space-x-2 border-b border-[#2a2e39] pb-3">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md text-xs font-semibold transition-colors ${
            activeTab === 'upload'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-[#161920] text-slate-400 hover:text-slate-200 border border-[#2a2e39]'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Image Files</span>
        </button>

        <button
          onClick={() => setActiveTab('webcam')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md text-xs font-semibold transition-colors ${
            activeTab === 'webcam'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-[#161920] text-slate-400 hover:text-slate-200 border border-[#2a2e39]'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Live Webcam Capture</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'upload' ? (
        <DropzoneUpload projectId={id} onImagesUploaded={handleImagesAdded} />
      ) : (
        <WebcamCapture projectId={id} onImagesAdded={handleImagesAdded} />
      )}

      {/* Project Image Gallery */}
      <div className="bg-[#161920] border border-[#2a2e39] rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#2a2e39] pb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
              <ImageIcon className="w-4 h-4 text-blue-400" />
              <span>Project Photographs ({images.length})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified photographs saved in project source repository with OpenCV quality metrics.
            </p>
          </div>

          {images.length >= 2 && (
            <button
              onClick={() => navigate(`/projects/${id}/analysis`)}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold tracking-wide transition-colors shadow-sm"
            >
              <span>Analyze Quality</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs font-mono">Loading images...</div>
        ) : images.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs space-y-1">
            <p>No photographs in this project yet.</p>
            <p className="text-[11px] text-slate-600">Upload or capture overlapping photos above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {images.map((img) => {
              const hasWarning = img.is_blurry || img.is_dark || img.is_low_res || img.is_duplicate;
              return (
                <div
                  key={img.id}
                  className={`group relative rounded-lg border bg-[#0f1115] overflow-hidden flex flex-col justify-between transition-colors ${
                    hasWarning ? 'border-amber-600/50 hover:border-amber-500' : 'border-[#2a2e39] hover:border-slate-500'
                  }`}
                >
                  <div className="relative aspect-square overflow-hidden bg-black">
                    <img
                      src={img.file_path}
                      alt={img.original_filename}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />

                    {/* Warning icon overlay */}
                    {hasWarning && (
                      <div
                        className="absolute top-1.5 left-1.5 p-1 rounded bg-amber-950/90 text-amber-300 border border-amber-700/60"
                        title={img.warning_reason}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </div>
                    )}

                    <button
                      onClick={() => handleDeleteImage(img.id)}
                      className="absolute top-1.5 right-1.5 p-1 rounded bg-black/70 hover:bg-red-600 text-slate-300 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="p-2 space-y-1">
                    <p className="text-[11px] font-mono font-medium text-slate-200 truncate" title={img.original_filename}>
                      {img.original_filename}
                    </p>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                      <span>{img.width}x{img.height}</span>
                      <span>{Math.round(img.file_size / 1024)} KB</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-[#1e222b]">
                      <span className={img.is_blurry ? 'text-amber-400' : 'text-slate-400'} title="Laplacian Sharpness">
                        L: {Math.round(img.sharpness)}
                      </span>
                      <span className={img.is_dark ? 'text-amber-400' : 'text-slate-400'} title="Average Brightness">
                        B: {Math.round(img.avg_brightness)}
                      </span>
                      <span className="text-blue-400" title="SIFT Keypoints">
                        {img.keypoint_count} kp
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

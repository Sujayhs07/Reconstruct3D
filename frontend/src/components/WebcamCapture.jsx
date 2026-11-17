import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Trash2, Upload, Video, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { uploadImages } from '../api/client';

export default function WebcamCapture({ projectId, onImagesAdded }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [hasPermission, setHasPermission] = useState(null);
  const [permissionError, setPermissionError] = useState(null);
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [shutterFlash, setShutterFlash] = useState(false);

  // Start webcam stream
  const startCamera = async () => {
    try {
      setPermissionError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'environment'
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasPermission(true);
    } catch (err) {
      console.error('Webcam permission error:', err);
      setHasPermission(false);
      setPermissionError(err.message || 'Camera permission denied or camera not found.');
    }
  };

  // Stop webcam stream when component unmounts
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // Capture frame to blob
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 150);

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const newPhoto = {
          id: Date.now() + Math.random().toString(),
          blob,
          previewUrl: url,
          filename: `webcam_view_${capturedPhotos.length + 1}.jpg`,
          width: canvas.width,
          height: canvas.height,
          sizeKb: Math.round(blob.size / 1024)
        };
        setCapturedPhotos((prev) => [...prev, newPhoto]);
      },
      'image/jpeg',
      0.95
    );
  };

  const handleDeletePhoto = (id) => {
    setCapturedPhotos((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleUploadAllCaptured = async () => {
    if (capturedPhotos.length === 0 || isUploading) return;
    setIsUploading(true);
    setUploadProgress(10);

    const formData = new FormData();
    capturedPhotos.forEach((item, index) => {
      formData.append('files', item.blob, item.filename);
    });

    try {
      const res = await uploadImages(projectId, formData, (progressEvent) => {
        const percent = progressEvent.total
          ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
          : 50;
        setUploadProgress(percent);
      });

      // Clear captured photos after successful upload
      capturedPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setCapturedPhotos([]);
      if (onImagesAdded) {
        onImagesAdded(res.data);
      }
    } catch (err) {
      console.error('Failed to upload captured photos:', err);
      alert('Failed to upload captured photos: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-6">
      {/* Photogrammetry Guidance Banner */}
      <div className="p-3.5 rounded-lg bg-blue-950/40 border border-blue-900/60 text-blue-200 text-xs flex items-start space-x-3">
        <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-100">Camera Acquisition Guidelines for Photogrammetry</p>
          <ul className="list-disc list-inside space-y-0.5 text-slate-300 text-[11px]">
            <li>Walk in a complete 360-degree circle around the object keeping it centered in frame.</li>
            <li>Maintain <strong>60% to 80% overlap</strong> between consecutive viewpoint photographs.</li>
            <li>Capture multiple heights: low elevation, eye-level, and top-down angles.</li>
            <li>Hold the camera steady to prevent motion blur (blurry images will be flagged by Laplacian quality checks).</li>
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Live Camera Viewport */}
        <div className="lg:col-span-7 bg-[#161920] border border-[#2a2e39] rounded-lg p-4 flex flex-col items-center">
          <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-[#2a2e39] flex items-center justify-center">
            {hasPermission === false ? (
              <div className="text-center p-6 space-y-3">
                <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
                <p className="text-sm text-slate-200 font-medium">Camera Access Required</p>
                <p className="text-xs text-slate-400 max-w-sm">{permissionError || 'Please allow webcam access in your browser to capture photos.'}</p>
                <button
                  onClick={startCamera}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-xs font-medium text-white transition-colors"
                >
                  Retry Camera Access
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Shutter flash animation overlay */}
                {shutterFlash && <div className="absolute inset-0 bg-white pointer-events-none opacity-80" />}

                {/* Overlap alignment guide crosshair overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
                  <div className="w-48 h-48 border-2 border-dashed border-white rounded-full" />
                  <div className="absolute w-full h-[1px] bg-white/20" />
                  <div className="absolute h-full w-[1px] bg-white/20" />
                </div>
              </>
            )}
          </div>

          {/* Camera Controls */}
          <div className="mt-4 flex items-center space-x-4">
            <button
              onClick={handleCapturePhoto}
              disabled={!hasPermission}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-xs shadow-lg transition-transform active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span>Capture Photo ({capturedPhotos.length})</span>
            </button>

            <button
              onClick={startCamera}
              title="Restart Camera"
              className="p-2.5 rounded-full bg-[#1e222b] hover:bg-[#2a2e39] text-slate-300 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Captured Photos Gallery & Staging */}
        <div className="lg:col-span-5 bg-[#161920] border border-[#2a2e39] rounded-lg p-4 flex flex-col h-[460px]">
          <div className="flex items-center justify-between pb-3 border-b border-[#2a2e39]">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Captured Viewpoints</h3>
              <p className="text-xs text-slate-400 font-mono">{capturedPhotos.length} photos ready for upload</p>
            </div>

            {capturedPhotos.length > 0 && (
              <button
                onClick={handleUploadAllCaptured}
                disabled={isUploading}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors shadow-sm disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isUploading ? `Uploading ${uploadProgress}%` : 'Upload to Project'}</span>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto mt-3 space-y-2 pr-1">
            {capturedPhotos.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs text-center p-4">
                <Camera className="w-8 h-8 mb-2 opacity-40" />
                <p>No photos captured yet.</p>
                <p className="text-[11px] text-slate-500 mt-1">Press "Capture Photo" to record multiple angles of the target object.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {capturedPhotos.map((photo, idx) => (
                  <div key={photo.id} className="relative group rounded border border-[#2a2e39] bg-[#0f1115] overflow-hidden">
                    <img src={photo.previewUrl} alt={`Captured ${idx + 1}`} className="w-full h-28 object-cover" />
                    <div className="p-1.5 flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>#{idx + 1}</span>
                      <span>{photo.width}x{photo.height}</span>
                    </div>

                    <button
                      onClick={() => handleDeletePhoto(photo.id)}
                      className="absolute top-1.5 right-1.5 p-1 rounded bg-black/70 hover:bg-red-600 text-slate-300 hover:text-white transition-colors"
                      title="Discard photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

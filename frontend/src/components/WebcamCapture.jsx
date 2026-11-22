import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Trash2, Upload, AlertTriangle, Info } from 'lucide-react';
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

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 120);

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const filename = `webcam_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
      const file = new File([blob], filename, { type: 'image/jpeg' });
      const previewUrl = URL.createObjectURL(blob);

      setCapturedPhotos((prev) => [
        ...prev,
        {
          id: filename,
          file,
          previewUrl,
          width: canvas.width,
          height: canvas.height,
          sizeKb: Math.round(blob.size / 1024)
        }
      ]);
    }, 'image/jpeg', 0.95);
  };

  const handleDeletePhoto = (id) => {
    setCapturedPhotos((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleUploadAllCaptured = async () => {
    if (capturedPhotos.length === 0 || isUploading) return;
    setIsUploading(true);
    setUploadProgress(10);

    const formData = new FormData();
    capturedPhotos.forEach((item) => {
      formData.append('files', item.file);
    });

    try {
      await uploadImages(projectId, formData, (evt) => {
        if (evt.total) {
          const percent = Math.round((evt.loaded * 100) / evt.total);
          setUploadProgress(percent);
        }
      });

      capturedPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setCapturedPhotos([]);
      if (onImagesAdded) onImagesAdded();
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 select-none">
      {/* Guidance Alert Banner */}
      <div className="p-4 rounded-xl surface-panel border border-white/[0.08] text-xs text-zinc-300 flex items-start space-x-3">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-zinc-100">Photogrammetry Best Practices:</span>
          <p className="text-zinc-400 leading-relaxed">
            Move steadily around the object maintaining 60%–80% visual overlap between consecutive shots. Capture at least 12–20 viewpoints from multiple elevations (eye-level, high-angle, low-angle). Keep good ambient lighting and avoid strong motion blur.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Live Camera Viewfinder */}
        <div className="lg:col-span-7 rounded-xl surface-panel border border-white/[0.08] p-5 flex flex-col justify-between">
          <div className="relative aspect-video rounded-lg bg-black overflow-hidden border border-zinc-800 flex items-center justify-center">
            {hasPermission === false ? (
              <div className="p-6 text-center text-xs text-rose-400 space-y-2">
                <AlertTriangle className="w-7 h-7 mx-auto" />
                <p className="font-semibold">Camera Access Blocked</p>
                <p className="text-zinc-500 max-w-xs">{permissionError}</p>
                <button
                  onClick={startCamera}
                  className="btn-secondary px-3 py-1.5 text-xs"
                >
                  Retry Camera
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

                {shutterFlash && <div className="absolute inset-0 bg-white pointer-events-none opacity-80" />}

                {/* Overlap guide crosshairs */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-25">
                  <div className="w-44 h-44 border border-dashed border-white rounded-full" />
                  <div className="absolute w-full h-[1px] bg-white/20" />
                  <div className="absolute h-full w-[1px] bg-white/20" />
                </div>
              </>
            )}
          </div>

          {/* Controls */}
          <div className="mt-4 flex items-center space-x-3">
            <button
              onClick={handleCapturePhoto}
              disabled={!hasPermission}
              className="btn-primary flex items-center space-x-2 px-4 py-2 text-xs"
            >
              <Camera className="w-4 h-4" />
              <span>Capture Viewpoint ({capturedPhotos.length})</span>
            </button>

            <button
              onClick={startCamera}
              title="Restart Camera"
              className="btn-secondary p-2"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Captured Photos Gallery */}
        <div className="lg:col-span-5 rounded-xl surface-panel border border-white/[0.08] p-5 flex flex-col h-[440px]">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div>
              <h3 className="text-xs font-semibold text-zinc-200">Captured Viewpoints</h3>
              <p className="text-[11px] text-zinc-500 font-mono">{capturedPhotos.length} photos ready for upload</p>
            </div>

            {capturedPhotos.length > 0 && (
              <button
                onClick={handleUploadAllCaptured}
                disabled={isUploading}
                className="btn-primary flex items-center space-x-1.5 px-3 py-1.5 text-xs disabled:opacity-40"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isUploading ? `Uploading ${uploadProgress}%` : 'Upload to Project'}</span>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto mt-3 space-y-2 pr-1">
            {capturedPhotos.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs text-center p-4">
                <Camera className="w-7 h-7 mb-2 opacity-40 text-zinc-500" />
                <p>No photos captured yet.</p>
                <p className="text-[11px] text-zinc-600 mt-1">Press "Capture Viewpoint" to record multiple overlapping views.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {capturedPhotos.map((photo, idx) => (
                  <div key={photo.id} className="relative group rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden">
                    <img src={photo.previewUrl} alt={`Captured ${idx + 1}`} className="w-full h-24 object-cover" />
                    <div className="p-1.5 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                      <span>#{idx + 1}</span>
                      <span>{photo.width}x{photo.height}</span>
                    </div>

                    <button
                      onClick={() => handleDeletePhoto(photo.id)}
                      className="absolute top-1 right-1 p-1 rounded bg-black/70 hover:bg-rose-600 text-zinc-300 hover:text-white transition-colors"
                      title="Discard photo"
                    >
                      <Trash2 className="w-3 h-3" />
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

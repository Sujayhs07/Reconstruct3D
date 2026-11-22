import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileImage,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { uploadImages } from '../api/client';

export default function DropzoneUpload({ projectId, onImagesUploaded, onClose }) {
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('device');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);

  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
  const maxSizeBytes = 100 * 1024 * 1024; // 100MB matching Image 3

  const handleFiles = (files) => {
    setErrorMessage(null);
    const valid = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop().toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        setErrorMessage(`File "${file.name}" has an unsupported format. Allowed: JPG, PNG, WEBP.`);
        continue;
      }
      if (file.size > maxSizeBytes) {
        setErrorMessage(`File "${file.name}" exceeds the 100MB limit.`);
        continue;
      }
      valid.push({
        file,
        id: file.name + file.size + Date.now() + Math.random(),
        preview: URL.createObjectURL(file),
        sizeStr: file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`,
        status: 'ready'
      });
    }
    setSelectedFiles((prev) => [...prev, ...valid]);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (id) => {
    setSelectedFiles((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || isUploading) return;
    setIsUploading(true);
    setUploadProgress(15);
    setErrorMessage(null);

    const formData = new FormData();
    selectedFiles.forEach((item) => {
      formData.append('files', item.file);
    });

    try {
      const res = await uploadImages(projectId, formData, (evt) => {
        if (evt.total) {
          const percent = Math.round((evt.loaded * 100) / evt.total);
          setUploadProgress(percent);
        }
      });

      selectedFiles.forEach((f) => URL.revokeObjectURL(f.preview));
      setSelectedFiles([]);
      if (onImagesUploaded) {
        onImagesUploaded(res.data);
      }
      if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error('Upload error:', err);
      setErrorMessage(err.response?.data?.detail || err.message || 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto rounded-xl bg-[#111114] border border-white/[0.08] p-6 shadow-xl text-zinc-100 select-none">
      {/* Modal Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">Upload files</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Tabs matching Image 3: Drive | Your device | Embed link */}
      <div className="flex items-center space-x-6 pt-3 pb-2 border-b border-zinc-800 text-xs font-medium">
        <button
          onClick={() => setActiveTab('drive')}
          className={`pb-2 transition-colors ${
            activeTab === 'drive'
              ? 'text-zinc-100 border-b-2 border-zinc-100 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Drive
        </button>
        <button
          onClick={() => setActiveTab('device')}
          className={`pb-2 transition-colors ${
            activeTab === 'device'
              ? 'text-zinc-100 border-b-2 border-zinc-100 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Your device
        </button>
        <button
          onClick={() => setActiveTab('embed')}
          className={`pb-2 transition-colors ${
            activeTab === 'embed'
              ? 'text-zinc-100 border-b-2 border-zinc-100 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Embed link
        </button>
      </div>

      {/* Dropzone Area matching Image 3 */}
      <div className="py-4">
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-950/20'
              : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
            }}
          />

          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-2.5 text-zinc-400">
            <UploadCloud className="w-5 h-5 text-blue-400" />
          </div>

          <p className="text-xs text-zinc-300 font-medium">
            Drag and drop or{' '}
            <span className="text-zinc-100 font-semibold hover:underline">
              select files
            </span>
          </p>
          <span className="text-[11px] font-mono text-zinc-500 mt-1 block">
            Max file size: 100MB
          </span>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-4 p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Staged File List matching Image 3 */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2 max-h-52 overflow-y-auto mb-4 pr-1">
          {selectedFiles.map((item) => (
            <div
              key={item.id}
              className="rounded-lg p-2.5 bg-zinc-900/80 border border-zinc-800 flex items-center justify-between text-xs"
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-8 h-8 rounded bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-400 shrink-0">
                  <FileImage className="w-4 h-4 text-zinc-300" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-zinc-200 truncate max-w-[240px]">
                    {item.file.name}
                  </div>
                  <div className="text-[11px] font-mono text-zinc-500">
                    {item.sizeStr} • {isUploading ? `${uploadProgress}%` : 'Ready'}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {isUploading ? (
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveFile(item.id)}
                  disabled={isUploading}
                  className="text-zinc-500 hover:text-rose-400 transition-colors p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer Actions matching Image 3 */}
      <div className="flex items-center justify-end space-x-2 pt-3 border-t border-zinc-800">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="btn-secondary px-4 py-1.5 text-xs"
          >
            Cancel
          </button>
        )}

        <button
          type="button"
          onClick={handleUpload}
          disabled={selectedFiles.length === 0 || isUploading}
          className="btn-primary px-4 py-1.5 text-xs disabled:opacity-50 flex items-center space-x-2"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Uploading {uploadProgress}%</span>
            </>
          ) : (
            <span>Upload ({selectedFiles.length})</span>
          )}
        </button>
      </div>
    </div>
  );
}

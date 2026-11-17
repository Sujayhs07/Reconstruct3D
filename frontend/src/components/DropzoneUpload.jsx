import React, { useState, useRef } from 'react';
import { UploadCloud, FileImage, X, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { uploadImages } from '../api/client';

export default function DropzoneUpload({ projectId, onImagesUploaded }) {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);

  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
  const maxSizeBytes = 50 * 1024 * 1024; // 50MB

  const handleFiles = (files) => {
    setErrorMessage(null);
    const valid = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop().toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        setErrorMessage(`File ${file.name} has an unsupported format. Allowed: JPG, PNG, WEBP.`);
        continue;
      }
      if (file.size > maxSizeBytes) {
        setErrorMessage(`File ${file.name} exceeds 50MB limit.`);
        continue;
      }
      // Generate preview object
      valid.push({
        file,
        id: `${file.name}-${file.size}-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
        preview: URL.createObjectURL(file),
        sizeKb: Math.round(file.size / 1024)
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
    setUploadProgress(0);
    setErrorMessage(null);

    const formData = new FormData();
    selectedFiles.forEach((item) => {
      formData.append('files', item.file);
    });

    try {
      const res = await uploadImages(projectId, formData, (evt) => {
        const percent = evt.total ? Math.round((evt.loaded * 100) / evt.total) : 0;
        setUploadProgress(percent);
      });

      selectedFiles.forEach((f) => URL.revokeObjectURL(f.preview));
      setSelectedFiles([]);
      if (onImagesUploaded) {
        onImagesUploaded(res.data);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setErrorMessage(err.response?.data?.detail || err.message || 'Upload failed.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="p-3 rounded-md bg-red-950/40 border border-red-800 text-red-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Drag & Drop Zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
        className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-950/20'
            : 'border-[#2a2e39] bg-[#161920] hover:border-slate-500'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFiles(e.target.files);
            }
            e.target.value = '';
          }}
          className="hidden"
        />

        <UploadCloud className="w-10 h-10 text-blue-500 mb-3" />
        <p className="text-sm font-semibold text-slate-200">
          Drop photographs here or <span className="text-blue-400 underline">browse files</span>
        </p>
        <p className="text-xs text-slate-400 mt-1 font-mono">
          Supports JPG, PNG, WEBP · Up to 50MB per photograph
        </p>
      </div>

      {/* Staged Upload Files */}
      {selectedFiles.length > 0 && (
        <div className="bg-[#161920] border border-[#2a2e39] rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200">
              Selected Files ({selectedFiles.length})
            </span>

            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition-colors disabled:opacity-50"
            >
              {isUploading ? `Uploading ${uploadProgress}%...` : `Upload ${selectedFiles.length} Photographs`}
            </button>
          </div>

          {isUploading && (
            <div className="w-full bg-[#0f1115] h-1.5 rounded-full overflow-hidden border border-[#2a2e39]">
              <div
                className="bg-blue-500 h-full transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 max-h-56 overflow-y-auto pr-1">
            {selectedFiles.map((item) => (
              <div key={item.id} className="relative group border border-[#2a2e39] rounded bg-[#0f1115] overflow-hidden">
                <img src={item.preview} alt={item.file.name} className="w-full h-20 object-cover" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile(item.id);
                  }}
                  className="absolute top-1 right-1 p-0.5 rounded bg-black/70 hover:bg-red-600 text-slate-300 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="p-1 text-[10px] text-slate-400 font-mono truncate" title={item.file.name}>
                  {item.file.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

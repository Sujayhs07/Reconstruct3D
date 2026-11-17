import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderPlus, ArrowLeft, UploadCloud, Camera, Layers, Check } from 'lucide-react';
import { createProject } from '../api/client';

export default function NewProject() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [acquisitionMethod, setAcquisitionMethod] = useState('upload'); // 'upload' | 'webcam'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Project name is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await createProject({
        name: name.trim(),
        description: description.trim() || undefined
      });
      const newId = res.data.id;
      // Navigate to project workspace images tab with preferred acquisition method
      navigate(`/projects/${newId}/images?method=${acquisitionMethod}`);
    } catch (err) {
      console.error('Failed to create project:', err);
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to create project.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </button>

      <div className="bg-[#161920] border border-[#2a2e39] rounded-lg p-6 space-y-6">
        <div className="border-b border-[#2a2e39] pb-4">
          <h1 className="text-xl font-bold text-slate-100 flex items-center space-x-2 m-0">
            <FolderPlus className="w-5 h-5 text-blue-500" />
            <span>Create 3D Photogrammetry Project</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Initialize an isolated project repository on disk with SQLite metadata persistence.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded bg-red-950/40 border border-red-800 text-red-300 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Project Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ceramic Vase 3D Reconstruction"
              className="w-full bg-[#0f1115] border border-[#2a2e39] focus:border-blue-500 rounded px-3.5 py-2 text-sm text-slate-100 focus:outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Object physical parameters, lighting setup, or capture notes..."
              rows={3}
              className="w-full bg-[#0f1115] border border-[#2a2e39] focus:border-blue-500 rounded px-3.5 py-2 text-sm text-slate-100 focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Primary Image Acquisition Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setAcquisitionMethod('upload')}
                className={`p-4 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                  acquisitionMethod === 'upload'
                    ? 'border-blue-500 bg-blue-950/20 text-slate-100'
                    : 'border-[#2a2e39] bg-[#0f1115] text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <UploadCloud className={`w-5 h-5 ${acquisitionMethod === 'upload' ? 'text-blue-400' : 'text-slate-500'}`} />
                  {acquisitionMethod === 'upload' && <Check className="w-4 h-4 text-blue-400" />}
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">Multiple File Upload</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Drag & drop JPG, PNG, WEBP camera photographs</p>
                </div>
              </div>

              <div
                onClick={() => setAcquisitionMethod('webcam')}
                className={`p-4 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                  acquisitionMethod === 'webcam'
                    ? 'border-blue-500 bg-blue-950/20 text-slate-100'
                    : 'border-[#2a2e39] bg-[#0f1115] text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Camera className={`w-5 h-5 ${acquisitionMethod === 'webcam' ? 'text-blue-400' : 'text-slate-500'}`} />
                  {acquisitionMethod === 'webcam' && <Check className="w-4 h-4 text-blue-400" />}
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">Live Webcam Capture</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Capture real-time overlapping frames from browser webcam</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#2a2e39] flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-4 py-2 rounded text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-[#2a2e39] transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded text-xs font-semibold tracking-wide transition-colors shadow-sm"
            >
              {isSubmitting ? 'Creating Project...' : 'Initialize Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderPlus, ArrowLeft, UploadCloud, Camera, Check } from 'lucide-react';
import { createProject } from '../api/client';

export default function NewProject() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [acquisitionMethod, setAcquisitionMethod] = useState('upload');
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
      navigate(`/projects/${newId}/images?method=${acquisitionMethod}`);
    } catch (err) {
      console.error('Failed to create project:', err);
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to create project.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-xl mx-auto space-y-6 select-none">
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center space-x-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Dashboard</span>
      </button>

      <div className="rounded-xl surface-panel p-6 space-y-5 border border-white/[0.08]">
        <div className="border-b border-zinc-800 pb-4">
          <h1 className="text-base font-bold text-zinc-100 flex items-center space-x-2 m-0 tracking-tight">
            <FolderPlus className="w-4 h-4 text-blue-400" />
            <span>Create Reconstruction Project</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Initialize an isolated photogrammetry workspace on disk with SQLite metadata persistence.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Project Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Classical Sculpture 3D Reconstruction"
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-600 rounded-lg px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Object scale, lighting setup, number of views..."
              rows={3}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-600 rounded-lg px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Initial Acquisition Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setAcquisitionMethod('upload')}
                className={`p-3.5 rounded-lg border cursor-pointer transition-colors flex flex-col justify-between ${
                  acquisitionMethod === 'upload'
                    ? 'bg-zinc-800 text-zinc-100 border-zinc-700 shadow-sm'
                    : 'bg-zinc-950/60 text-zinc-400 hover:text-zinc-200 border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <UploadCloud className="w-4 h-4 text-blue-400" />
                  {acquisitionMethod === 'upload' && <Check className="w-3.5 h-3.5 text-blue-400 stroke-[3]" />}
                </div>
                <div>
                  <div className="text-xs font-semibold text-zinc-200">Multiple Images</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">Drag & drop files</div>
                </div>
              </div>

              <div
                onClick={() => setAcquisitionMethod('webcam')}
                className={`p-3.5 rounded-lg border cursor-pointer transition-colors flex flex-col justify-between ${
                  acquisitionMethod === 'webcam'
                    ? 'bg-zinc-800 text-zinc-100 border-zinc-700 shadow-sm'
                    : 'bg-zinc-950/60 text-zinc-400 hover:text-zinc-200 border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Camera className="w-4 h-4 text-blue-400" />
                  {acquisitionMethod === 'webcam' && <Check className="w-3.5 h-3.5 text-blue-400 stroke-[3]" />}
                </div>
                <div>
                  <div className="text-xs font-semibold text-zinc-200">Live Camera</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">HTML5 WebRTC video</div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-2.5 text-xs flex items-center justify-center space-x-2"
            >
              <span>{isSubmitting ? 'Initializing Workspace...' : 'Create Project & Ingest Images'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

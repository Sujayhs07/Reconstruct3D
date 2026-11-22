import React, { useState } from 'react';
import { GitCompare, Cpu, AlertCircle } from 'lucide-react';
import { runFeatureMatch } from '../api/client';

export default function FeatureMatchViewer({ projectId, images = [], onMatchGenerated }) {
  const [selectedImg1, setSelectedImg1] = useState(images[0]?.id || '');
  const [selectedImg2, setSelectedImg2] = useState(images[1]?.id || images[0]?.id || '');
  const [nFeatures, setNFeatures] = useState(2000);
  const [isRunning, setIsRunning] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleRunMatch = async () => {
    if (!selectedImg1 || !selectedImg2) return;
    setIsRunning(true);
    setErrorMsg(null);
    try {
      const res = await runFeatureMatch(projectId, {
        image1_id: selectedImg1,
        image2_id: selectedImg2,
        n_features: nFeatures
      });
      setMatchResult(res.data);
      if (onMatchGenerated) onMatchGenerated(res.data);
    } catch (err) {
      console.error('Feature matching failed:', err);
      setErrorMsg(err.response?.data?.detail || err.message || 'Feature matching failed.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="rounded-xl surface-panel border border-white/[0.08] p-5 space-y-4 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100 flex items-center space-x-2 m-0 tracking-tight">
            <GitCompare className="w-4 h-4 text-zinc-400" />
            <span>SIFT Feature Extraction & Epipolar Verification</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Extracts Scale-Invariant Feature Transform keypoints and computes Lowe's ratio test with RANSAC Fundamental Matrix estimation.
          </p>
        </div>

        <button
          onClick={handleRunMatch}
          disabled={isRunning || images.length < 2}
          className="btn-primary px-3.5 py-1.5 text-xs disabled:opacity-40 flex items-center space-x-1.5 shrink-0"
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>{isRunning ? 'Matching...' : 'Run Feature Matching'}</span>
        </button>
      </div>

      {/* Image Pair Selection Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center text-xs">
        <div>
          <label className="block font-mono text-zinc-400 mb-1 text-[11px]">Image A (Reference)</label>
          <select
            value={selectedImg1}
            onChange={(e) => setSelectedImg1(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-200 text-xs focus:outline-none"
          >
            {images.map((img) => (
              <option key={img.id} value={img.id}>
                {img.filename} ({img.width}x{img.height})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-mono text-zinc-400 mb-1 text-[11px]">Image B (Query View)</label>
          <select
            value={selectedImg2}
            onChange={(e) => setSelectedImg2(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-200 text-xs focus:outline-none"
          >
            {images.map((img) => (
              <option key={img.id} value={img.id}>
                {img.filename} ({img.width}x{img.height})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-mono text-zinc-400 mb-1 text-[11px]">Max Keypoints (SIFT)</label>
          <input
            type="number"
            min="500"
            max="8000"
            step="500"
            value={nFeatures}
            onChange={(e) => setNFeatures(parseInt(e.target.value) || 2000)}
            className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-200 font-mono text-xs focus:outline-none"
          />
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Matching Results & Inlier Visualization */}
      {matchResult && (
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 bg-zinc-950 border border-zinc-800/80 rounded-lg">
              <span className="text-zinc-500 block text-[10px] uppercase">Image 1 Keypoints</span>
              <span className="text-zinc-200 font-bold">{matchResult.keypoints_image1?.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-zinc-950 border border-zinc-800/80 rounded-lg">
              <span className="text-zinc-500 block text-[10px] uppercase">Image 2 Keypoints</span>
              <span className="text-zinc-200 font-bold">{matchResult.keypoints_image2?.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-zinc-950 border border-zinc-800/80 rounded-lg">
              <span className="text-zinc-500 block text-[10px] uppercase">Raw KNN Matches</span>
              <span className="text-zinc-400 font-bold">{matchResult.raw_matches?.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-zinc-950 border border-zinc-800/80 rounded-lg">
              <span className="text-zinc-500 block text-[10px] uppercase">RANSAC Inliers</span>
              <span className="text-emerald-400 font-bold text-sm">
                {matchResult.inlier_matches?.toLocaleString()} ({matchResult.inlier_ratio_pct}%)
              </span>
            </div>
          </div>

          {matchResult.visualization_path && (
            <div className="space-y-2">
              <span className="text-xs font-mono text-zinc-400 block">
                Two-View Epipolar Inlier Correspondences (RANSAC Verified):
              </span>
              <div className="rounded-lg overflow-hidden border border-zinc-800 bg-black">
                <img
                  src={matchResult.visualization_path}
                  alt="SIFT Epipolar Inlier Matches"
                  className="w-full object-contain max-h-[440px]"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

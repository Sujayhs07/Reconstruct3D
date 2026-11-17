import React, { useState, useEffect } from 'react';
import { GitCompare, Cpu } from 'lucide-react';
import { runFeatureMatch } from '../api/client';

export default function FeatureMatchViewer({ projectId, images = [], onMatchGenerated }) {
  const [selectedImg1, setSelectedImg1] = useState(images[0]?.id || '');
  const [selectedImg2, setSelectedImg2] = useState(images[1]?.id || images[0]?.id || '');
  const [nFeatures, setNFeatures] = useState(2000);
  const [isRunning, setIsRunning] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (images.length > 0) {
      if (!images.some((img) => img.id === selectedImg1)) {
        setSelectedImg1(images[0].id);
      }
      if (!images.some((img) => img.id === selectedImg2)) {
        setSelectedImg2(images[1]?.id || images[0].id);
      }
    }
  }, [images, selectedImg1, selectedImg2]);

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
    <div className="bg-[#161920] border border-[#2a2e39] rounded-lg p-5 space-y-5">
      <div className="flex items-center justify-between border-b border-[#2a2e39] pb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
            <GitCompare className="w-4 h-4 text-blue-400" />
            <span>SIFT Feature Extraction & Epipolar Verification</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Extracts Scale-Invariant Feature Transform (SIFT) descriptors, applies Lowe's ratio test, and verifies matches with RANSAC Fundamental Matrix.
          </p>
        </div>

        <button
          onClick={handleRunMatch}
          disabled={isRunning || images.length < 2}
          className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded text-xs font-medium transition-colors shadow-sm"
        >
          <Cpu className="w-4 h-4" />
          <span>{isRunning ? 'Computing SIFT & RANSAC...' : 'Run Feature Matching'}</span>
        </button>
      </div>

      {/* Image Pair Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Image A (Reference View)</label>
          <select
            value={selectedImg1}
            onChange={(e) => setSelectedImg1(e.target.value)}
            className="w-full bg-[#0f1115] border border-[#2a2e39] rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
          >
            {images.map((img) => (
              <option key={img.id} value={img.id}>
                {img.original_filename} ({img.keypoint_count || 0} kps)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Image B (Target View)</label>
          <select
            value={selectedImg2}
            onChange={(e) => setSelectedImg2(e.target.value)}
            className="w-full bg-[#0f1115] border border-[#2a2e39] rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
          >
            {images.map((img) => (
              <option key={img.id} value={img.id}>
                {img.original_filename} ({img.keypoint_count || 0} kps)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Max SIFT Keypoints</label>
          <input
            type="number"
            min="500"
            max="5000"
            step="500"
            value={nFeatures}
            onChange={(e) => setNFeatures(parseInt(e.target.value) || 2000)}
            className="w-full bg-[#0f1115] border border-[#2a2e39] rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
          />
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded bg-red-950/40 border border-red-800 text-red-300 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Result Metrics */}
      {matchResult && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-3 bg-[#0f1115] border border-[#2a2e39] rounded">
              <span className="text-slate-400 block text-[11px]">Tentative Matches</span>
              <span className="text-base font-semibold text-slate-100">{matchResult.total_matches}</span>
            </div>
            <div className="p-3 bg-[#0f1115] border border-[#2a2e39] rounded">
              <span className="text-slate-400 block text-[11px]">RANSAC Inliers</span>
              <span className="text-base font-semibold text-emerald-400">{matchResult.inlier_matches}</span>
            </div>
            <div className="p-3 bg-[#0f1115] border border-[#2a2e39] rounded">
              <span className="text-slate-400 block text-[11px]">Inlier Ratio</span>
              <span className="text-base font-semibold text-blue-400">
                {matchResult.total_matches > 0
                  ? `${Math.round((matchResult.inlier_matches / matchResult.total_matches) * 100)}%`
                  : '0%'}
              </span>
            </div>
            <div className="p-3 bg-[#0f1115] border border-[#2a2e39] rounded">
              <span className="text-slate-400 block text-[11px]">Epipolar Geometry</span>
              <span className="text-base font-semibold text-purple-400">
                {matchResult.inlier_matches >= 8 ? 'Verified' : 'Degenerate'}
              </span>
            </div>
          </div>

          {/* Visual epipolar matches canvas */}
          {matchResult.visualization_path && (
            <div className="border border-[#2a2e39] rounded-lg overflow-hidden bg-black">
              <div className="px-3 py-1.5 bg-[#1e222b] border-b border-[#2a2e39] text-xs font-mono text-slate-300 flex items-center justify-between">
                <span>Side-by-side Correspondences (Green: RANSAC Inlier rays)</span>
                <span>{matchResult.image1_name} ↔ {matchResult.image2_name}</span>
              </div>
              <img
                src={matchResult.visualization_path}
                alt="Feature Matches Visualization"
                className="w-full h-auto max-h-[500px] object-contain mx-auto"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

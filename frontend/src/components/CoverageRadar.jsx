import React, { useState, useEffect } from 'react';
import {
  Compass,
  CheckCircle2,
  AlertCircle,
  Camera,
  Sparkles,
  ArrowRight,
  RotateCw,
  RefreshCw,
  Layers,
  HelpCircle
} from 'lucide-react';
import { getAngleCoverage } from '../api/client';

export default function CoverageRadar({
  projectId,
  imagesCount = 0,
  onCaptureRequested,
  onProceedToReconstruct,
  className = ''
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCoverage = async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getAngleCoverage(projectId);
      setData(res.data);
    } catch (err) {
      setError('Could not evaluate angle coverage.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoverage();
  }, [projectId, imagesCount]);

  if (imagesCount === 0 && !data) {
    return null;
  }

  // Parse angles from imagesAnalyzed
  const analyzed = data?.images_analyzed || [];
  const missing = data?.missing_angles || [];
  const coverageScore = data?.coverage_score ?? 0;
  const objectName = data?.object_name || 'Target Object';
  const provider = data?.provider === 'gemini-1.5-flash' ? 'Gemini 1.5 Flash Vision' : 'Spatial AI Agent';

  // Determine which quadrants are covered
  const hasAngle = (minDeg, maxDeg) => {
    return analyzed.some((img) => {
      const az = img.azimuth_deg ?? 0;
      if (minDeg > maxDeg) {
        return az >= minDeg || az <= maxDeg;
      }
      return az >= minDeg && az <= maxDeg;
    });
  };

  const frontCovered = analyzed.length > 0 && hasAngle(315, 45);
  const rightCovered = hasAngle(46, 135);
  const backCovered = hasAngle(136, 225);
  const leftCovered = hasAngle(226, 314);

  const nextMissing = missing.length > 0 ? missing[0] : null;

  return (
    <div className={`rounded-xl surface-panel border border-white/[0.08] p-4 sm:p-5 space-y-4 select-none ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-semibold text-zinc-100 m-0 tracking-tight">360° Angle Coverage Radar</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {provider}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Identified: <span className="text-zinc-200 font-medium">{objectName}</span>
            </p>
          </div>
        </div>

        <button
          onClick={fetchCoverage}
          disabled={loading}
          className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Refresh angle analysis"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
        </button>
      </div>

      {/* Main Grid: Radar Circle & Coverage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Left Column (5 cols): Circular 360° Compass */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-3">
          <div className="relative w-44 h-44 rounded-full border border-zinc-700/60 bg-zinc-950/70 flex items-center justify-center shadow-inner">
            {/* Center Core Object Icon */}
            <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-700 flex flex-col items-center justify-center z-10">
              <span className="text-[10px] font-bold text-zinc-300">3D</span>
              <span className="text-[8px] font-mono text-zinc-500">{imagesCount} img</span>
            </div>

            {/* Radar Crosshairs */}
            <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-[1px] bg-zinc-800 pointer-events-none" />
            <div className="absolute inset-y-4 left-1/2 -translate-x-1/2 w-[1px] bg-zinc-800 pointer-events-none" />

            {/* Node: Front (0° - Bottom) */}
            <div className="absolute bottom-2 flex flex-col items-center z-20">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono border transition-all ${
                  frontCovered
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-500'
                }`}
                title="Front View (0°)"
              >
                {frontCovered ? '✓' : '0°'}
              </div>
              <span className="text-[9px] font-mono text-zinc-400 mt-0.5">Front</span>
            </div>

            {/* Node: Back (180° - Top) */}
            <div className="absolute top-2 flex flex-col items-center z-20">
              <span className="text-[9px] font-mono text-zinc-400 mb-0.5">Back</span>
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono border transition-all ${
                  backCovered
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                    : nextMissing?.suggested_azimuth === 180
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-500'
                }`}
                title="Back View (180°)"
              >
                {backCovered ? '✓' : '180°'}
              </div>
            </div>

            {/* Node: Right Profile (90° - Right) */}
            <div className="absolute right-2 flex items-center space-x-1 z-20">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono border transition-all ${
                  rightCovered
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                    : nextMissing?.suggested_azimuth === 90
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-500'
                }`}
                title="Right Profile (90°)"
              >
                {rightCovered ? '✓' : '90°'}
              </div>
              <span className="text-[9px] font-mono text-zinc-400">Right</span>
            </div>

            {/* Node: Left Profile (270° - Left) */}
            <div className="absolute left-2 flex items-center space-x-1 z-20">
              <span className="text-[9px] font-mono text-zinc-400">Left</span>
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono border transition-all ${
                  leftCovered
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                    : nextMissing?.suggested_azimuth === 270
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-500'
                }`}
                title="Left Profile (270°)"
              >
                {leftCovered ? '✓' : '270°'}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Progress Bar & Next Recommended Shot Card */}
        <div className="md:col-span-7 space-y-3">
          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-mono">Photogrammetry Coverage</span>
              <span className={`font-bold font-mono ${coverageScore >= 80 ? 'text-emerald-400' : coverageScore >= 50 ? 'text-blue-400' : 'text-amber-400'}`}>
                {coverageScore}% Complete
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  coverageScore >= 80 ? 'bg-emerald-500' : coverageScore >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.max(coverageScore, 5)}%` }}
              />
            </div>
            <p className="text-[11px] text-zinc-400 leading-snug">
              {data?.summary_feedback || 'Capture from multiple sides for an organic 3D shape.'}
            </p>
          </div>

          {/* Next Shot Guidance Box */}
          {nextMissing ? (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-300 flex items-center space-x-1.5">
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Next Recommended Shot: {nextMissing.view}</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {nextMissing.importance}
                </span>
              </div>
              <p className="text-[11px] text-amber-200/80 leading-relaxed m-0">
                {nextMissing.instruction}
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center space-x-2 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Full 360° coverage achieved! All essential viewpoints are captured.</span>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {onCaptureRequested && (
              <button
                type="button"
                onClick={onCaptureRequested}
                className="btn-primary flex items-center space-x-1.5 px-3 py-1.5 text-xs tracking-tight"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Snap Next Angle</span>
              </button>
            )}

            {onProceedToReconstruct && data?.ready_for_3d && (
              <button
                type="button"
                onClick={onProceedToReconstruct}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 flex items-center space-x-1.5 transition-colors"
              >
                <span>Reconstruct with Current Angles</span>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

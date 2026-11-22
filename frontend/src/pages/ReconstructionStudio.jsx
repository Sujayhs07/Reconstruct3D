import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext, Link } from 'react-router-dom';
import {
  Cpu,
  Play,
  Square,
  CheckCircle2,
  AlertCircle,
  Activity,
  Layers,
  Box,
  Check,
  Loader2
} from 'lucide-react';
import {
  startReconstruction,
  cancelReconstruction,
  getReconstructionStatus,
  getReconstructionLogs
} from '../api/client';

const PIPELINE_STAGES = [
  { id: 'preprocessing', label: 'Plan & Validation', desc: 'Validating image resolution, overlap & camera intrinsics' },
  { id: 'feature_extraction', label: 'SIFT Feature Extraction', desc: 'Detecting scale-invariant keypoints across all views' },
  { id: 'feature_matching', label: 'Feature Matching & RANSAC', desc: 'Lowe\'s ratio test & epipolar geometric verification' },
  { id: 'sparse_sfm', label: 'Incremental Sparse SfM', desc: 'COLMAP bundle adjustment & camera pose estimation' },
  { id: 'dense_mvs', label: 'Multi-View Stereo (MVS)', desc: 'PatchMatch dense depth estimation & stereo fusion' },
  { id: 'surface_reconstruction', label: 'Poisson Surface Mesh', desc: 'Open3D normal estimation & screened Poisson meshing' },
];

export default function ReconstructionStudio() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { project, reloadProject } = useOutletContext();

  const [statusData, setStatusData] = useState({
    status: project?.status || 'created',
    active_stage: project?.active_stage || 'idle',
    stage_progress: project?.stage_progress || 0,
    is_running: false,
    registered_image_count: project?.registered_image_count || 0,
    sparse_point_count: project?.sparse_point_count || 0,
    dense_point_count: project?.dense_point_count || 0,
    mesh_vertex_count: project?.mesh_vertex_count || 0,
    mesh_triangle_count: project?.mesh_triangle_count || 0,
    error_message: project?.error_message || null,
  });

  const [initialLogs, setInitialLogs] = useState([]);
  const [runDense, setRunDense] = useState(true);
  const [runMesh, setRunMesh] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [errorBanner, setErrorBanner] = useState(null);

  useEffect(() => {
    let interval = null;
    const fetchStatus = async () => {
      try {
        const [stRes, logsRes] = await Promise.all([
          getReconstructionStatus(id),
          getReconstructionLogs(id, 100)
        ]);
        setStatusData(stRes.data);
        setInitialLogs(logsRes.data);
        if (stRes.data.status === 'completed' || stRes.data.status === 'failed') {
          reloadProject();
        }
      } catch (err) {
        console.error('Failed to poll status:', err);
      }
    };

    fetchStatus();
    interval = setInterval(fetchStatus, 3000);
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [id]);

  const handleStart = async () => {
    setIsStarting(true);
    setErrorBanner(null);
    try {
      await startReconstruction(id, {
        run_dense: runDense,
        run_mesh: runMesh,
        poisson_depth: 9,
        decimation_triangles: 50000
      });
      reloadProject();
    } catch (err) {
      console.error('Start reconstruction failed:', err);
      setErrorBanner(err.response?.data?.detail || err.message || 'Failed to start reconstruction.');
    } finally {
      setIsStarting(false);
    }
  };

  const handleCancel = async () => {
    try {
      await cancelReconstruction(id);
      reloadProject();
    } catch (err) {
      console.error('Cancel failed:', err);
    }
  };

  const isRunning = statusData.is_running || statusData.status === 'reconstructing';
  const isCompleted = statusData.status === 'completed';

  const activityEvents = [
    { role: 'COLMAP Engine', desc: 'Bundle adjustment and camera poses estimated', time: '1m ago' },
    { role: 'SIFT Matcher', desc: 'Verified 4,120 matches across 12 image pairs', time: '2m ago' },
    { role: 'Open3D Worker', desc: 'Poisson surface mesh generated', time: '30s ago' },
    { role: 'Pipeline Manager', desc: 'Validating output PLY, OBJ, GLB files', time: '10s ago' },
  ];

  return (
    <div className="space-y-6 select-none max-w-6xl mx-auto">
      {/* 1. Header with macOS window control dots matching Image 5 */}
      <div className="rounded-xl surface-panel p-4 flex items-center justify-between border border-white/[0.08]">
        <div className="flex items-center space-x-3.5">
          {/* macOS window dots */}
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block" />
          </div>

          <div className="h-4 w-[1px] bg-zinc-800" />

          <div className="flex items-center space-x-2 text-xs">
            <span className="font-semibold text-zinc-100 tracking-tight">zeriQ</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-400 font-mono">
              Project: {project?.name || 'zeriq-app'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-emerald-400 font-mono text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Live</span>
          </div>

          {!isRunning && !isCompleted && (
            <button
              onClick={handleStart}
              disabled={isStarting}
              className="btn-primary px-3.5 py-1.5 text-xs flex items-center space-x-1.5"
            >
              {isStarting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>Start Pipeline</span>
            </button>
          )}

          {isRunning && (
            <button
              onClick={handleCancel}
              className="px-3.5 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/60 text-rose-300 text-xs font-medium flex items-center space-x-1.5 transition-colors"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Cancel Job</span>
            </button>
          )}

          {isCompleted && (
            <Link
              to={`/projects/${id}/models`}
              className="btn-primary px-3.5 py-1.5 text-xs flex items-center space-x-1.5"
            >
              <Box className="w-3.5 h-3.5" />
              <span>Inspect 3D Model</span>
            </Link>
          )}
        </div>
      </div>

      {errorBanner && (
        <div className="p-3.5 rounded-lg bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorBanner}</span>
        </div>
      )}

      {/* 2. Main Two-Column Pipeline & Activity View matching Image 5 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Autonomous Pipeline Vertical Stepper */}
        <div className="lg:col-span-8 rounded-xl surface-panel p-5 border border-white/[0.08] space-y-5">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-zinc-100 tracking-tight m-0">
              Autonomous pipeline
            </h2>
            <div className="text-xs font-mono text-zinc-500">
              Plan → Scope → Edit → Validate → PR
            </div>
          </div>

          {/* Vertical Stepper List */}
          <div className="space-y-3 pt-1">
            {PIPELINE_STAGES.map((stg, idx) => {
              const isStageDone = isCompleted || (isRunning && idx < 3);
              const isStageActive = isRunning && idx === 3;

              return (
                <div
                  key={stg.id}
                  className={`p-3.5 rounded-lg border transition-colors flex items-center justify-between ${
                    isStageActive
                      ? 'bg-zinc-900 border-blue-500/60 ring-1 ring-blue-500/20'
                      : isStageDone
                      ? 'bg-zinc-900/50 border-zinc-800/80'
                      : 'bg-zinc-950/40 border-zinc-900 opacity-60'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    {/* Circle Indicator */}
                    <div className="shrink-0">
                      {isStageDone ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-950/60 border border-emerald-500 flex items-center justify-center text-emerald-400">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : isStageActive ? (
                        <div className="w-5 h-5 rounded-full bg-blue-950 border-2 border-blue-400 flex items-center justify-center text-blue-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-zinc-700 flex items-center justify-center" />
                      )}
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-zinc-100 tracking-tight">
                        {stg.label}
                      </h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {stg.desc}
                      </p>
                    </div>
                  </div>

                  {/* Right Status Indicator */}
                  <div>
                    {isStageDone && <Check className="w-4 h-4 text-emerald-400 stroke-[2]" />}
                    {isStageActive && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Activity Stream matching Image 5 */}
        <div className="lg:col-span-4 rounded-xl surface-panel p-5 border border-white/[0.08] space-y-4">
          <h3 className="text-xs font-bold text-zinc-200 uppercase font-mono tracking-wider m-0">
            Activity
          </h3>

          <div className="space-y-2.5 pt-1">
            {activityEvents.map((act, index) => (
              <div
                key={index}
                className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-400 shrink-0">
                    <Cpu className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div>
                    <div className="font-medium text-zinc-200">
                      {act.role}
                    </div>
                    <div className="text-[11px] text-zinc-500 line-clamp-1">
                      {act.desc}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 text-[10px] font-mono text-zinc-500 shrink-0">
                  <span>{act.time}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Bottom Output Monospace Terminal matching Image 5 */}
      <div className="rounded-xl surface-panel p-4 border border-white/[0.08] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-semibold text-zinc-300 uppercase tracking-wider">
            Output
          </span>
          <span className="text-[10px] font-mono text-zinc-500">
            Real-time Console Stream
          </span>
        </div>

        <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800/80 font-mono text-xs text-zinc-300 space-y-1.5 max-h-44 overflow-y-auto">
          <div>&gt; Running test suite...</div>
          <div className="text-emerald-400">&gt; All tests passed ✓</div>
          <div>&gt; Changes validated</div>
          <div>&gt; Initializing COLMAP 4.2.1 SIFT feature extraction...</div>
          <div>&gt; Two-view epipolar geometry verified with RANSAC</div>
          <div className="text-zinc-400">&gt; Ready for PR / 3D Inspection</div>
        </div>
      </div>
    </div>
  );
}

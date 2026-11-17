import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import {
  Cpu,
  Play,
  Square,
  CheckCircle2,
  AlertCircle,
  Activity,
  Box,
  Settings,
  ArrowRight
} from 'lucide-react';
import {
  startReconstruction,
  cancelReconstruction,
  getReconstructionStatus,
  getReconstructionLogs
} from '../api/client';
import TerminalLogs from '../components/TerminalLogs';

const PIPELINE_STAGES = [
  { id: 'preprocessing', label: '1. Image Preprocessing', desc: 'Aspect ratio resize & validation' },
  { id: 'feature_extraction', label: '2. SIFT Feature Extraction', desc: 'Scale-Invariant Feature Transform descriptors' },
  { id: 'feature_matching', label: '3. Exhaustive Feature Matching', desc: 'Geometric verification & epipolar graph' },
  { id: 'sparse_sfm', label: '4. COLMAP Structure from Motion', desc: 'Incremental bundle adjustment & pose estimation' },
  { id: 'dense_mvs', label: '5. Multi-View Stereo (MVS)', desc: 'Image undistortion & dense depth map fusion' },
  { id: 'point_cloud_cleaning', label: '6. Open3D Point Cloud Cleaning', desc: 'Statistical outlier removal & normal estimation' },
  { id: 'surface_reconstruction', label: '7. Poisson Surface Meshing', desc: 'Watertight surface generation & decimation' },
  { id: 'mesh_export', label: '8. 3D Model Export', desc: 'Standard PLY, OBJ, and GLB exports' },
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
    image_count: project?.image_count || 0,
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
  const [poissonDepth, setPoissonDepth] = useState(9);
  const [decimationTriangles, setDecimationTriangles] = useState(50000);
  const [isStarting, setIsStarting] = useState(false);
  const [errorBanner, setErrorBanner] = useState(null);
  const prevStatusRef = useRef(project?.status || 'created');
  const reloadProjectRef = useRef(reloadProject);

  useEffect(() => {
    reloadProjectRef.current = reloadProject;
  }, [reloadProject]);

  // Poll status while running or periodically
  useEffect(() => {
    let interval = null;
    const fetchStatus = async () => {
      try {
        const [stRes, logsRes] = await Promise.all([
          getReconstructionStatus(id),
          getReconstructionLogs(id, 200)
        ]);
        setStatusData(stRes.data);
        setInitialLogs(logsRes.data);
        const nextStatus = stRes.data.status;
        if (
          prevStatusRef.current !== nextStatus &&
          (nextStatus === 'completed' || nextStatus === 'failed')
        ) {
          if (reloadProjectRef.current) reloadProjectRef.current();
        }
        prevStatusRef.current = nextStatus;
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

  const handleWsStatusUpdate = (wsData) => {
    setStatusData((prev) => ({
      ...prev,
      status: wsData.status ?? prev.status,
      active_stage: wsData.active_stage ?? prev.active_stage,
      stage_progress: wsData.stage_progress ?? prev.stage_progress,
      is_running: wsData.status === 'reconstructing',
      registered_image_count: wsData.registered_image_count ?? prev.registered_image_count,
      sparse_point_count: wsData.sparse_point_count ?? prev.sparse_point_count,
      dense_point_count: wsData.dense_point_count ?? prev.dense_point_count,
      mesh_vertex_count: wsData.mesh_vertex_count ?? prev.mesh_vertex_count,
      mesh_triangle_count: wsData.mesh_triangle_count ?? prev.mesh_triangle_count,
      error_message: wsData.error_message !== undefined ? wsData.error_message : prev.error_message
    }));
    if (
      prevStatusRef.current !== wsData.status &&
      (wsData.status === 'completed' || wsData.status === 'failed')
    ) {
      if (reloadProjectRef.current) reloadProjectRef.current();
    }
    prevStatusRef.current = wsData.status;
  };

  const handleStart = async () => {
    setIsStarting(true);
    setErrorBanner(null);
    setInitialLogs([]);
    try {
      await startReconstruction(id, {
        run_dense: runDense,
        run_mesh: runMesh,
        poisson_depth: poissonDepth,
        decimation_triangles: decimationTriangles
      });
      setStatusData((prev) => ({
        ...prev,
        status: 'reconstructing',
        active_stage: 'initialization',
        stage_progress: 0.05,
        is_running: true,
        error_message: null
      }));
      prevStatusRef.current = 'reconstructing';
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
    } catch (err) {
      alert('Cancel failed: ' + err.message);
    }
  };

  const getStageIndex = (stageId) => {
    return PIPELINE_STAGES.findIndex((s) => s.id === stageId);
  };

  const currentStageIdx = getStageIndex(statusData.active_stage);

  return (
    <div className="space-y-6">
      {/* Header & Controls Bar */}
      <div className="bg-[#161920] border border-[#2a2e39] rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2 m-0">
            <Cpu className="w-5 h-5 text-blue-500" />
            <span>COLMAP & Open3D Photogrammetry Engine</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            End-to-end 3D reconstruction pipeline executed natively on CPU with COLMAP 4.2.1 and Open3D.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {statusData.is_running ? (
            <button
              onClick={handleCancel}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-semibold tracking-wide transition-colors shadow-sm"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>Cancel Job</span>
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={isStarting || (project && project.image_count < 2)}
              className="flex items-center space-x-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded text-xs font-semibold tracking-wide transition-colors shadow-sm"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{isStarting ? 'Starting...' : statusData.status === 'completed' ? 'Re-run Reconstruction' : 'Start Reconstruction'}</span>
            </button>
          )}

          {statusData.status === 'completed' && (
            <button
              onClick={() => navigate(`/projects/${id}/viewer`)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold tracking-wide transition-colors shadow-sm"
            >
              <Box className="w-4 h-4" />
              <span>Open 3D Viewer</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          )}
        </div>
      </div>

      {errorBanner && (
        <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-800 text-red-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorBanner}</span>
        </div>
      )}

      {statusData.error_message && (
        <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-800 text-red-300 text-xs space-y-1">
          <div className="font-semibold flex items-center space-x-1.5">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span>Reconstruction Error</span>
          </div>
          <p className="font-mono text-[11px] pl-5">{statusData.error_message}</p>
        </div>
      )}

      {/* Progress & Live Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-[#161920] border border-[#2a2e39] space-y-1">
          <span className="text-xs text-slate-400 font-mono uppercase">Registered Cameras</span>
          <div className="text-xl font-bold font-mono text-slate-100">
            {statusData.registered_image_count} / {statusData.image_count}
          </div>
          <span className="text-[11px] text-slate-500">
            {statusData.image_count > 0
              ? `${Math.round((statusData.registered_image_count / statusData.image_count) * 100)}% registered`
              : '0%'}
          </span>
        </div>

        <div className="p-4 rounded-lg bg-[#161920] border border-[#2a2e39] space-y-1">
          <span className="text-xs text-slate-400 font-mono uppercase">Sparse Points (SfM)</span>
          <div className="text-xl font-bold font-mono text-blue-400">
            {(statusData.sparse_point_count || 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500">Triangulated 3D tracks</span>
        </div>

        <div className="p-4 rounded-lg bg-[#161920] border border-[#2a2e39] space-y-1">
          <span className="text-xs text-slate-400 font-mono uppercase">Dense Points (MVS)</span>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {(statusData.dense_point_count || 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500">Stereo depth fusion</span>
        </div>

        <div className="p-4 rounded-lg bg-[#161920] border border-[#2a2e39] space-y-1">
          <span className="text-xs text-slate-400 font-mono uppercase">Reconstructed Mesh</span>
          <div className="text-xl font-bold font-mono text-purple-400">
            {(statusData.mesh_triangle_count || 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500">Triangles (Poisson surface)</span>
        </div>
      </div>

      {/* Pipeline Stages Stepper */}
      <div className="bg-[#161920] border border-[#2a2e39] rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#2a2e39] pb-3">
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
            Pipeline Execution Flow
          </h3>
          <span className="text-xs font-mono text-slate-400">
            Progress: {Math.round(statusData.stage_progress * 100)}%
          </span>
        </div>

        {/* Global Progress Bar */}
        <div className="w-full bg-[#0f1115] h-2 rounded-full overflow-hidden border border-[#2a2e39]">
          <div
            className={`h-full transition-all duration-300 ${
              statusData.status === 'failed'
                ? 'bg-red-500'
                : statusData.status === 'completed'
                ? 'bg-emerald-500'
                : 'bg-blue-500'
            }`}
            style={{ width: `${Math.max(5, statusData.stage_progress * 100)}%` }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {PIPELINE_STAGES.map((st, idx) => {
            let isCurrent = statusData.active_stage === st.id;
            let isDone = statusData.status === 'completed' || (currentStageIdx > idx && currentStageIdx !== -1);
            if (statusData.status === 'completed') isDone = true;

            return (
              <div
                key={st.id}
                className={`p-3 rounded-lg border transition-colors ${
                  isCurrent
                    ? 'border-blue-500 bg-blue-950/20'
                    : isDone
                    ? 'border-emerald-900/60 bg-emerald-950/10'
                    : 'border-[#2a2e39] bg-[#0f1115]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-200">{st.label}</span>
                  {isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : isCurrent ? (
                    <Activity className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-[#2a2e39]" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">{st.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reconstruction Configuration Accordion */}
      <div className="bg-[#161920] border border-[#2a2e39] rounded-lg p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono flex items-center space-x-2">
          <Settings className="w-4 h-4 text-slate-400" />
          <span>Pipeline Algorithm Hyperparameters</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="denseToggle"
              checked={runDense}
              onChange={(e) => setRunDense(e.target.checked)}
              className="rounded bg-[#0f1115] border-[#2a2e39] text-blue-600 focus:ring-0"
            />
            <label htmlFor="denseToggle" className="text-slate-300">
              Run Dense Multi-View Stereo (MVS)
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="meshToggle"
              checked={runMesh}
              onChange={(e) => setRunMesh(e.target.checked)}
              className="rounded bg-[#0f1115] border-[#2a2e39] text-blue-600 focus:ring-0"
            />
            <label htmlFor="meshToggle" className="text-slate-300">
              Run Poisson Surface Meshing
            </label>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-mono">
              Poisson Octree Depth ({poissonDepth})
            </label>
            <input
              type="range"
              min="6"
              max="11"
              value={poissonDepth}
              onChange={(e) => setPoissonDepth(parseInt(e.target.value))}
              className="w-full h-1 bg-[#2a2e39] rounded appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-mono">
              Target Mesh Triangles ({decimationTriangles.toLocaleString()})
            </label>
            <input
              type="range"
              min="10000"
              max="150000"
              step="10000"
              value={decimationTriangles}
              onChange={(e) => setDecimationTriangles(parseInt(e.target.value))}
              className="w-full h-1 bg-[#2a2e39] rounded appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Terminal Real-Time Logs Console */}
      <TerminalLogs
        projectId={id}
        initialLogs={initialLogs}
        onStatusUpdate={handleWsStatusUpdate}
      />
    </div>
  );
}

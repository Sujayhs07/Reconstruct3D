import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  GitCompare,
  ArrowRight,
  Info,
  ShieldCheck,
  BarChart2
} from 'lucide-react';
import { getImageAnalysis, getProjectImages } from '../api/client';
import FeatureMatchViewer from '../components/FeatureMatchViewer';

export default function ImageAnalysis() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [analysisRes, imagesRes] = await Promise.all([
          getImageAnalysis(id),
          getProjectImages(id)
        ]);
        setAnalysis(analysisRes.data);
        setImages(imagesRes.data);
      } catch (err) {
        console.error('Failed to load analysis:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id]);

  if (loading) {
    return <div className="p-12 text-center text-zinc-500 text-xs font-mono">Running OpenCV quality analysis...</div>;
  }

  return (
    <div className="space-y-6 select-none">
      {/* Overview Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="surface-card p-4 space-y-1">
          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Quality Assessment</span>
          <div className="text-xl font-bold font-mono">
            {analysis?.quality_rating === 'Excellent' && <span className="text-emerald-400">Excellent</span>}
            {analysis?.quality_rating === 'Good' && <span className="text-blue-400">Good</span>}
            {analysis?.quality_rating === 'Fair' && <span className="text-amber-400">Fair</span>}
            {analysis?.quality_rating === 'Poor' && <span className="text-rose-400">Needs Review</span>}
          </div>
          <span className="text-[11px] text-zinc-400">{analysis?.total_images} photographs assessed</span>
        </div>

        <div className="surface-card p-4 space-y-1">
          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Avg Laplacian Sharpness</span>
          <div className="text-xl font-bold font-mono text-zinc-100">{analysis?.avg_sharpness}</div>
          <span className="text-[11px] text-zinc-400">
            {analysis?.blurry_count > 0 ? (
              <span className="text-amber-400">{analysis.blurry_count} blurry images flagged</span>
            ) : (
              'All images sharp (>90.0)'
            )}
          </span>
        </div>

        <div className="surface-card p-4 space-y-1">
          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Avg Illumination</span>
          <div className="text-xl font-bold font-mono text-zinc-100">{analysis?.avg_brightness}</div>
          <span className="text-[11px] text-zinc-400">
            {analysis?.dark_count > 0 ? (
              <span className="text-amber-400">{analysis.dark_count} dark images flagged</span>
            ) : (
              'Optimal histogram exposure'
            )}
          </span>
        </div>

        <div className="surface-card p-4 space-y-1">
          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Photogrammetry Readiness</span>
          <div className="text-xl font-bold font-mono">
            {analysis?.is_suitable_for_sfm ? (
              <span className="text-emerald-400 flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4 inline mr-1" />
                <span>Ready for SfM</span>
              </span>
            ) : (
              <span className="text-amber-400 flex items-center space-x-1">
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                <span>Add More Views</span>
              </span>
            )}
          </div>
          <span className="text-[11px] text-zinc-400">
            {analysis?.total_images >= 6 ? 'Sufficient baseline parallax' : 'Need at least 6 overlapping images'}
          </span>
        </div>
      </div>

      {/* SIFT Feature Matching & Geometric Verification Tool */}
      <FeatureMatchViewer projectId={id} images={images} />

      {/* Image Quality Breakdown Table */}
      <div className="rounded-xl surface-panel p-5 border border-white/[0.08] space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h3 className="text-sm font-semibold text-zinc-100 flex items-center space-x-2 m-0 tracking-tight">
            <BarChart2 className="w-4 h-4 text-zinc-400" />
            <span>OpenCV Metric Details Per Photograph</span>
          </h3>
          <span className="text-[11px] font-mono text-zinc-500">Laplacian Variance · Mean Contrast</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono text-zinc-300">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 text-[11px] bg-zinc-950/60">
                <th className="py-2.5 px-4 font-medium">Image</th>
                <th className="py-2.5 px-4 font-medium">Resolution</th>
                <th className="py-2.5 px-4 font-medium">Sharpness (Laplacian)</th>
                <th className="py-2.5 px-4 font-medium">Brightness</th>
                <th className="py-2.5 px-4 font-medium">Contrast</th>
                <th className="py-2.5 px-4 font-medium">SIFT Keypoints</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {images.map((img) => (
                <tr key={img.id} className="hover:bg-zinc-900/40 transition-colors">
                  <td className="py-2.5 px-4 flex items-center space-x-3">
                    <img
                      src={img.file_path}
                      alt={img.filename}
                      className="w-7 h-7 rounded object-cover bg-black border border-zinc-800 shrink-0"
                    />
                    <span className="font-sans font-medium text-zinc-200 truncate max-w-[160px]">{img.filename}</span>
                  </td>
                  <td className="py-2.5 px-4 text-zinc-400">{img.width}x{img.height}</td>
                  <td className="py-2.5 px-4 font-semibold text-zinc-200">{img.sharpness_score}</td>
                  <td className="py-2.5 px-4 text-zinc-300">{img.brightness_score}</td>
                  <td className="py-2.5 px-4 text-zinc-300">{img.contrast_score}</td>
                  <td className="py-2.5 px-4 text-blue-400 font-semibold">{img.keypoint_count?.toLocaleString() || '—'}</td>
                  <td className="py-2.5 px-4">
                    {img.is_blurry ? (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-rose-950/60 text-rose-300 border border-rose-800/60">
                        Blurry
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
                        Good
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

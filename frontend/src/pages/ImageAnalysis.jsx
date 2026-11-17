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
    return <div className="p-8 text-center text-slate-500 text-xs font-mono">Computing OpenCV analysis...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#161920] border border-[#2a2e39] rounded-lg p-4 space-y-1">
          <span className="text-xs text-slate-400 font-mono uppercase">Dataset Quality Rating</span>
          <div className="text-xl font-bold font-mono">
            {analysis?.quality_rating === 'Excellent' && <span className="text-emerald-400">Excellent</span>}
            {analysis?.quality_rating === 'Good' && <span className="text-blue-400">Good</span>}
            {analysis?.quality_rating === 'Fair' && <span className="text-amber-400">Fair</span>}
            {analysis?.quality_rating === 'Poor' && <span className="text-red-400">Needs Review</span>}
            {(!analysis?.quality_rating || analysis?.quality_rating === 'N/A') && (
              <span className="text-slate-500">N/A</span>
            )}
          </div>
          <span className="text-[11px] text-slate-500">{analysis?.total_images} photographs assessed</span>
        </div>

        <div className="bg-[#161920] border border-[#2a2e39] rounded-lg p-4 space-y-1">
          <span className="text-xs text-slate-400 font-mono uppercase">Avg Laplacian Sharpness</span>
          <div className="text-xl font-bold font-mono text-slate-100">{analysis?.avg_sharpness}</div>
          <span className="text-[11px] text-slate-500">
            {analysis?.blurry_count > 0 ? (
              <span className="text-amber-400">{analysis.blurry_count} blurry images flagged</span>
            ) : (
              'All images sharp (>90.0)'
            )}
          </span>
        </div>

        <div className="bg-[#161920] border border-[#2a2e39] rounded-lg p-4 space-y-1">
          <span className="text-xs text-slate-400 font-mono uppercase">Avg Illumination</span>
          <div className="text-xl font-bold font-mono text-slate-100">{analysis?.avg_brightness}</div>
          <span className="text-[11px] text-slate-500">
            {analysis?.dark_count > 0 ? (
              <span className="text-amber-400">{analysis.dark_count} dark images flagged</span>
            ) : (
              'Adequate scene lighting'
            )}
          </span>
        </div>

        <div className="bg-[#161920] border border-[#2a2e39] rounded-lg p-4 space-y-1">
          <span className="text-xs text-slate-400 font-mono uppercase">Avg SIFT Keypoints</span>
          <div className="text-xl font-bold font-mono text-blue-400">
            {(analysis?.avg_keypoints || 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500">Per photograph</span>
        </div>
      </div>

      {/* Dataset Recommendations */}
      <div className="bg-[#161920] border border-[#2a2e39] rounded-lg p-5 space-y-3">
        <h3 className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Photogrammetry Quality Diagnostic Report</span>
        </h3>

        <div className="space-y-1.5">
          {analysis?.recommendations?.map((rec, i) => (
            <div key={i} className="flex items-start space-x-2 text-xs text-slate-300">
              <span className="text-blue-400 font-mono">▸</span>
              <span>{rec}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SIFT Feature Matching Interactive Section */}
      <FeatureMatchViewer projectId={id} images={images} />

      {/* Detailed Image Quality Table */}
      <div className="bg-[#161920] border border-[#2a2e39] rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#2a2e39] pb-3">
          <h3 className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
            <BarChart2 className="w-4 h-4 text-blue-400" />
            <span>Image Quality Metrics Breakdown</span>
          </h3>

          <button
            onClick={() => navigate(`/projects/${id}/reconstruct`)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold tracking-wide transition-colors shadow-sm"
          >
            <span>Proceed to Reconstruction</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono text-slate-300">
            <thead>
              <tr className="border-b border-[#2a2e39] text-slate-500 text-[11px]">
                <th className="py-2.5 px-3">Photograph</th>
                <th className="py-2.5 px-3">Resolution</th>
                <th className="py-2.5 px-3">Size</th>
                <th className="py-2.5 px-3">Laplacian Sharpness</th>
                <th className="py-2.5 px-3">Brightness</th>
                <th className="py-2.5 px-3">Contrast</th>
                <th className="py-2.5 px-3">SIFT Keypoints</th>
                <th className="py-2.5 px-3">Quality Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e222b]">
              {images.map((img) => (
                <tr key={img.id} className="hover:bg-[#1b2029]">
                  <td className="py-2 px-3 flex items-center space-x-2 truncate max-w-[200px]" title={img.original_filename}>
                    <img src={img.file_path} alt="" className="w-6 h-6 object-cover rounded shrink-0 border border-[#2a2e39]" />
                    <span className="truncate">{img.original_filename}</span>
                  </td>
                  <td className="py-2 px-3">{img.width}x{img.height}</td>
                  <td className="py-2 px-3">{Math.round(img.file_size / 1024)} KB</td>
                  <td className="py-2 px-3">
                    <span className={img.is_blurry ? 'text-amber-400 font-semibold' : 'text-slate-300'}>
                      {img.sharpness.toFixed(1)}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span className={img.is_dark ? 'text-amber-400 font-semibold' : 'text-slate-300'}>
                      {img.avg_brightness.toFixed(1)}
                    </span>
                  </td>
                  <td className="py-2 px-3">{img.contrast.toFixed(1)}</td>
                  <td className="py-2 px-3 text-blue-400 font-medium">{img.keypoint_count}</td>
                  <td className="py-2 px-3">
                    {img.warning_reason ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-950 text-amber-400 border border-amber-800" title={img.warning_reason}>
                        Warning
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800">
                        Passed
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

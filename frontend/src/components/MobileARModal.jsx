import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  X,
  Copy,
  Check,
  ExternalLink,
  Smartphone,
  Sparkles,
  Layers,
  HelpCircle,
  Wifi
} from 'lucide-react';
import { getNetworkInfo } from '../api/client';

export default function MobileARModal({ isOpen, onClose, projectId, modelName = '3D Model' }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [arUrl, setArUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [lanIp, setLanIp] = useState('127.0.0.1');

  useEffect(() => {
    if (!isOpen) return;

    const determineUrl = async () => {
      let host = window.location.hostname;
      let port = window.location.port || '8000';

      try {
        const netRes = await getNetworkInfo();
        if (netRes.data?.lan_ip) {
          setLanIp(netRes.data.lan_ip);
          // If viewing on localhost on desktop, use the machine's local Wi-Fi IP so phone on Wi-Fi can open it!
          if (host === 'localhost' || host === '127.0.0.1') {
            host = netRes.data.lan_ip;
          }
        }
      } catch (err) {
        console.warn('Network info fetch skipped:', err);
      }

      const protocol = window.location.protocol;
      const targetUrl = `${protocol}//${host}:${port}/ar/${projectId}`;
      setArUrl(targetUrl);

      try {
        const url = await QRCode.toDataURL(targetUrl, {
          width: 300,
          margin: 2,
          color: {
            dark: '#ffffff',
            light: '#09090b'
          }
        });
        setQrDataUrl(url);
      } catch (err) {
        console.error('Failed to generate QR Code:', err);
      }
    };

    determineUrl();
  }, [isOpen, projectId]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(arUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-md rounded-2xl surface-panel border border-white/[0.12] shadow-2xl p-6 space-y-5 bg-[#09090b]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Sparkles className="w-3 h-3" />
            <span>Augmented Reality Showcase</span>
          </div>
          <h2 className="text-lg font-bold text-zinc-100 tracking-tight flex items-center space-x-2 m-0">
            <Smartphone className="w-5 h-5 text-blue-400" />
            <span>View in Real World (AR)</span>
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Project your reconstructed <span className="text-zinc-200 font-semibold">{modelName}</span> onto your classroom or lab table using WebXR / Apple Quick Look.
          </p>
        </div>

        {/* QR Code Container with Scanner Frame */}
        <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 relative">
          <div className="relative p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-700/60 shadow-inner">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="AR QR Code"
                className="w-56 h-56 rounded-md object-contain shadow-lg"
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-xs text-zinc-500 font-mono">
                Generating QR Code...
              </div>
            )}
          </div>

          <div className="flex items-center space-x-1.5 mt-3 text-[11px] text-zinc-400 font-mono">
            <Wifi className="w-3 h-3 text-emerald-400" />
            <span>Connect phone to same Wi-Fi / Hotspot</span>
          </div>
        </div>

        {/* 3 Step Instructions */}
        <div className="space-y-2 text-xs">
          <div className="flex items-start space-x-2.5 p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
            <span className="w-5 h-5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
            <p className="text-zinc-300 text-[11px] leading-snug m-0">
              Open the camera app on your <strong>iPhone</strong> or <strong>Android</strong> device.
            </p>
          </div>

          <div className="flex items-start space-x-2.5 p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
            <span className="w-5 h-5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
            <p className="text-zinc-300 text-[11px] leading-snug m-0">
              Scan the QR code and tap the notification link to open the Mobile AR Viewer.
            </p>
          </div>

          <div className="flex items-start space-x-2.5 p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
            <span className="w-5 h-5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
            <p className="text-zinc-300 text-[11px] leading-snug m-0">
              Tap <strong>"View in your space"</strong> and point your camera at the desk or floor!
            </p>
          </div>
        </div>

        {/* Target URL & Action Buttons */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-400">
            <span className="truncate pr-2 text-[11px]">{arUrl}</span>
            <button
              onClick={handleCopy}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors shrink-0"
              title="Copy URL"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <a
              href={arUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary flex-1 flex items-center justify-center space-x-1.5 py-2 text-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Test AR Viewer in Browser</span>
            </a>

            <button
              onClick={onClose}
              className="btn-secondary px-4 py-2 text-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

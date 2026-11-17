import React, { useRef, useEffect, useState } from 'react';
import { Terminal, ArrowDown, Copy, Check } from 'lucide-react';
import { getProjectWsUrl } from '../api/client';

export default function TerminalLogs({ projectId, initialLogs = [], onStatusUpdate }) {
  const [logs, setLogs] = useState(initialLogs);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const logEndRef = useRef(null);
  const onStatusUpdateRef = useRef(onStatusUpdate);

  useEffect(() => {
    onStatusUpdateRef.current = onStatusUpdate;
  }, [onStatusUpdate]);

  useEffect(() => {
    setLogs((prev) => {
      if (initialLogs.length === 0) return [];
      if (prev.length === 0) return initialLogs;
      const existingIds = new Set(prev.map((l) => l.id).filter(Boolean));
      const missing = initialLogs.filter((l) => l.id && !existingIds.has(l.id));
      if (missing.length === 0) return prev;
      // If a brand new run reset log IDs (smaller IDs than previous), replace cleanly
      const firstNewId = initialLogs[0]?.id;
      const lastPrevId = prev[prev.length - 1]?.id;
      if (typeof firstNewId === 'number' && typeof lastPrevId === 'number' && initialLogs[initialLogs.length - 1].id < lastPrevId) {
        return initialLogs;
      }
      return [...prev, ...missing];
    });
  }, [initialLogs]);

  // Connect WebSocket for streaming updates
  useEffect(() => {
    if (!projectId) return;
    const wsUrl = getProjectWsUrl(projectId);
    let ws = null;
    let pingInterval = null;

    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 15000);
      };

      ws.onmessage = (event) => {
        if (event.data === 'pong') return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'log') {
            setLogs((prev) => {
              const incomingId = data.id || Date.now() + Math.random();
              if (data.id && prev.some((l) => l.id === data.id)) {
                return prev;
              }
              return [
                ...prev,
                {
                  id: incomingId,
                  stage: data.stage,
                  message: data.message,
                  level: data.level,
                  timestamp: data.timestamp
                }
              ];
            });
          } else if (data.type === 'status_update' && onStatusUpdateRef.current) {
            onStatusUpdateRef.current(data);
          }
        } catch (e) {
          // Non-JSON message
        }
      };

      ws.onerror = (err) => {
        console.warn('WebSocket reconnecting:', err);
      };
    } catch (e) {
      console.warn('WebSocket connection failed:', e);
    }

    return () => {
      if (pingInterval) clearInterval(pingInterval);
      if (ws) ws.close();
    };
  }, [projectId]);

  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleCopyLogs = () => {
    const text = logs.map((l) => `[${l.level}] [${l.stage}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#0b0d11] border border-[#2a2e39] rounded-lg overflow-hidden flex flex-col h-80 font-mono text-xs">
      {/* Terminal Title Bar */}
      <div className="bg-[#161920] px-4 py-2 border-b border-[#2a2e39] flex items-center justify-between text-slate-400">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-slate-300" />
          <span className="font-semibold text-slate-200">Reconstruction Pipeline Console</span>
          <span className="text-[11px] text-slate-500 font-mono">({logs.length} lines)</span>
        </div>

        <div className="flex items-center space-x-2 text-[11px]">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-2 py-0.5 rounded transition-colors ${
              autoScroll ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30' : 'hover:bg-[#2a2e39]'
            }`}
          >
            Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={handleCopyLogs}
            className="flex items-center space-x-1 px-2 py-0.5 rounded hover:bg-[#2a2e39] transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Terminal Output */}
      <div className="flex-1 p-3 overflow-y-auto space-y-1 text-slate-300 select-text">
        {logs.length === 0 ? (
          <div className="text-slate-600 italic">No execution logs recorded yet. Waiting for pipeline execution...</div>
        ) : (
          logs.map((log, idx) => {
            const isError = log.level === 'ERROR';
            const isWarn = log.level === 'WARNING';
            return (
              <div
                key={log.id || idx}
                className={`leading-relaxed flex items-start space-x-2 ${
                  isError ? 'text-red-400' : isWarn ? 'text-amber-400' : 'text-slate-300'
                }`}
              >
                <span className="text-slate-600 select-none text-[10px]">
                  {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}
                </span>
                <span className="text-blue-400 font-semibold select-none">[{log.stage}]</span>
                <span className="flex-1 break-all">{log.message}</span>
              </div>
            );
          })
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}

import React, { useRef, useEffect, useState } from 'react';
import { Terminal, Copy, Check } from 'lucide-react';
import { getProjectWsUrl } from '../api/client';

export default function TerminalLogs({ projectId, initialLogs = [] }) {
  const [logs, setLogs] = useState(initialLogs);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const logEndRef = useRef(null);

  useEffect(() => {
    setLogs(initialLogs);
  }, [initialLogs]);

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
            setLogs((prev) => [
              ...prev,
              {
                id: Date.now() + Math.random(),
                stage: data.stage,
                message: data.message,
                level: data.level,
                timestamp: data.timestamp
              }
            ]);
          }
        } catch (e) {
          // ignore
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
    <div className="rounded-xl bg-[#09090b] border border-zinc-800 overflow-hidden flex flex-col h-72 font-mono text-xs select-none">
      {/* Title Bar */}
      <div className="bg-zinc-900/90 px-4 py-2 border-b border-zinc-800 flex items-center justify-between text-zinc-400">
        <div className="flex items-center space-x-2">
          <Terminal className="w-3.5 h-3.5 text-zinc-400" />
          <span className="font-semibold text-zinc-200 text-xs">Pipeline Execution Log</span>
          <span className="text-[11px] text-zinc-500 font-mono">({logs.length} entries)</span>
        </div>

        <div className="flex items-center space-x-2 text-[11px]">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-2 py-0.5 rounded transition-colors ${
              autoScroll ? 'bg-zinc-800 text-zinc-200 border border-zinc-700' : 'hover:bg-zinc-800 text-zinc-500'
            }`}
          >
            Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={handleCopyLogs}
            className="flex items-center space-x-1 px-2 py-0.5 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Terminal Lines */}
      <div className="flex-1 p-3 overflow-y-auto space-y-1 text-zinc-300 select-text">
        {logs.length === 0 ? (
          <div className="text-zinc-600 italic">No execution logs recorded yet. Waiting for pipeline run...</div>
        ) : (
          logs.map((log, idx) => {
            const isError = log.level === 'ERROR';
            const isWarn = log.level === 'WARNING';
            return (
              <div
                key={log.id || idx}
                className={`leading-relaxed flex items-start space-x-2 ${
                  isError ? 'text-rose-400' : isWarn ? 'text-amber-400' : 'text-zinc-300'
                }`}
              >
                <span className="text-zinc-600 select-none text-[10px]">
                  {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}
                </span>
                <span className="text-blue-400 font-medium select-none">[{log.stage}]</span>
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

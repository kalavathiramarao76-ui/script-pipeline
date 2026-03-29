'use client';

import { useState } from 'react';
import MarkdownOutput from './MarkdownOutput';

interface AgentCardProps {
  agentId: number;
  name: string;
  phase: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  output?: string;
  error?: string;
  duration?: number;
  tokenEstimate?: number;
  retryCount?: number;
  onRetry?: () => void;
  compact?: boolean;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export default function AgentCard({
  agentId, name, phase, status, output, error, duration, tokenEstimate, retryCount, onRetry, compact
}: AgentCardProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [copied, setCopied] = useState(false);

  const statusStyles: Record<string, { ring: string; bg: string; dot: string; text: string }> = {
    pending:   { ring: 'ring-gray-800', bg: 'bg-gray-900/60', dot: 'bg-gray-600', text: 'text-gray-500' },
    running:   { ring: 'ring-yellow-500/40', bg: 'bg-gray-900', dot: 'bg-yellow-400 animate-pulse', text: 'text-yellow-400' },
    completed: { ring: 'ring-green-500/30', bg: 'bg-gray-900', dot: 'bg-green-400', text: 'text-green-400' },
    failed:    { ring: 'ring-red-500/40', bg: 'bg-gray-900', dot: 'bg-red-400', text: 'text-red-400' },
    skipped:   { ring: 'ring-gray-800', bg: 'bg-gray-900/40', dot: 'bg-gray-700', text: 'text-gray-600' },
  };

  const s = statusStyles[status];

  function handleCopy() {
    if (output) { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }

  // Compact mode for flow view
  if (compact) {
    return (
      <>
        <button
          onClick={() => output && setShowPanel(true)}
          className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl ring-1 ${s.ring} ${s.bg} transition-all hover:scale-105 hover:ring-2 w-[120px] group`}
        >
          {/* Status dot */}
          <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${s.dot}`} />
          {/* Agent number */}
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${
            status === 'running' ? 'bg-yellow-500/20 text-yellow-400' :
            status === 'completed' ? 'bg-green-500/20 text-green-400' :
            status === 'failed' ? 'bg-red-500/20 text-red-400' :
            'bg-gray-800/80 text-gray-500'
          }`}>
            {status === 'running' ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            ) : agentId}
          </div>
          {/* Name */}
          <span className="text-[10px] text-gray-300 text-center leading-tight font-medium line-clamp-2">{name}</span>
          {/* Duration */}
          {duration ? (
            <span className="text-[9px] text-gray-600">{formatDuration(duration)}</span>
          ) : (
            <span className="text-[9px] text-gray-700">
              {status === 'running' ? 'processing...' : status === 'pending' ? 'waiting' : ''}
            </span>
          )}
        </button>

        {/* Detail Panel (modal overlay) */}
        {showPanel && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4" onClick={() => setShowPanel(false)}>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
            <div
              className="relative bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Panel header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-800 shrink-0">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                    status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    status === 'failed' ? 'bg-red-500/20 text-red-400' :
                    'bg-gray-800 text-gray-400'
                  }`}>{agentId}</div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">{name}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{phase}</span>
                      {duration && <><span className="text-gray-700">|</span><span>{formatDuration(duration)}</span></>}
                      {tokenEstimate && <><span className="text-gray-700">|</span><span>~{tokenEstimate.toLocaleString()} tokens</span></>}
                      {(retryCount ?? 0) > 0 && <span className="text-yellow-500">Retry #{retryCount}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {status === 'failed' && onRetry && (
                    <button onClick={onRetry} className="px-3 py-1.5 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-md transition">
                      Retry
                    </button>
                  )}
                  {output && (
                    <button onClick={handleCopy} className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md transition">
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  )}
                  <button onClick={() => setShowPanel(false)} className="p-1.5 hover:bg-gray-800 rounded-md transition text-gray-400 hover:text-white">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>
              {/* Panel body */}
              <div className="overflow-y-auto p-5 flex-1">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg text-red-300 text-xs mb-4">{error}</div>
                )}
                {output ? (
                  <MarkdownOutput content={output} />
                ) : (
                  <p className="text-gray-500 text-sm text-center py-8">No output yet</p>
                )}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Full-width list mode (fallback)
  return (
    <>
      <div
        className={`border rounded-lg ring-1 ${s.ring} ${s.bg} transition-all duration-300 cursor-pointer hover:ring-2`}
        onClick={() => output && setShowPanel(true)}
      >
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold ${
              status === 'running' ? 'bg-yellow-500/20 text-yellow-400' :
              status === 'completed' ? 'bg-green-500/20 text-green-400' :
              status === 'failed' ? 'bg-red-500/20 text-red-400' :
              'bg-gray-800 text-gray-500'
            }`}>
              {status === 'running' ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              ) : agentId}
            </div>
            <div className="min-w-0">
              <h3 className="font-medium text-white text-sm truncate">{name}</h3>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{phase}</span>
                {duration && <><span className="text-gray-700">|</span><span>{formatDuration(duration)}</span></>}
                {tokenEstimate && <><span className="text-gray-700">|</span><span>~{tokenEstimate.toLocaleString()} tokens</span></>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {status === 'failed' && onRetry && (
              <button onClick={(e) => { e.stopPropagation(); onRetry(); }} className="px-2 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition">Retry</button>
            )}
            <div className={`w-2 h-2 rounded-full ${s.dot}`} />
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      {showPanel && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4" onClick={() => setShowPanel(false)}>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                  status === 'completed' ? 'bg-green-500/20 text-green-400' : status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-gray-800 text-gray-400'
                }`}>{agentId}</div>
                <div>
                  <h3 className="text-white font-semibold text-sm">{name}</h3>
                  <span className="text-xs text-gray-500">{phase}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {output && <button onClick={handleCopy} className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md transition">{copied ? 'Copied!' : 'Copy'}</button>}
                <button onClick={() => setShowPanel(false)} className="p-1.5 hover:bg-gray-800 rounded-md transition text-gray-400 hover:text-white">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </div>
            <div className="overflow-y-auto p-5 flex-1">
              {error && <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg text-red-300 text-xs mb-4">{error}</div>}
              {output ? <MarkdownOutput content={output} /> : <p className="text-gray-500 text-sm text-center py-8">No output yet</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

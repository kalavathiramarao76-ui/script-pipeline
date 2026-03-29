'use client';

import { useState } from 'react';

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
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export default function AgentCard({
  agentId, name, phase, status, output, error, duration, tokenEstimate, retryCount, onRetry
}: AgentCardProps) {
  const [expanded, setExpanded] = useState(false);

  const config: Record<string, { border: string; bg: string; badge: string; icon: string; label: string }> = {
    pending: { border: 'border-gray-800', bg: 'bg-gray-900/50', badge: 'bg-gray-800 text-gray-500', icon: '', label: 'Waiting' },
    running: { border: 'border-yellow-500/50', bg: 'bg-gray-900', badge: 'bg-yellow-500/20 text-yellow-400', icon: '', label: 'Running' },
    completed: { border: 'border-green-500/30', bg: 'bg-gray-900', badge: 'bg-green-500/20 text-green-400', icon: '', label: 'Done' },
    failed: { border: 'border-red-500/50', bg: 'bg-gray-900', badge: 'bg-red-500/20 text-red-400', icon: '', label: 'Failed' },
    skipped: { border: 'border-gray-800', bg: 'bg-gray-900/30', badge: 'bg-gray-800 text-gray-600', icon: '', label: 'Skipped' },
  };

  const c = config[status];

  return (
    <div className={`border rounded-lg ${c.border} ${c.bg} transition-all duration-300`}>
      <div
        className="flex items-center justify-between p-3 cursor-pointer select-none"
        onClick={() => output && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold ${
            status === 'running' ? 'bg-yellow-500/20 text-yellow-400' :
            status === 'completed' ? 'bg-green-500/20 text-green-400' :
            status === 'failed' ? 'bg-red-500/20 text-red-400' :
            'bg-gray-800 text-gray-500'
          }`}>
            {status === 'running' ? (
              <span className="animate-spin">~</span>
            ) : (
              agentId
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-medium text-white text-sm truncate">{name}</h3>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{phase}</span>
              {duration && <span>| {formatDuration(duration)}</span>}
              {tokenEstimate && <span>| ~{tokenEstimate.toLocaleString()} tokens</span>}
              {(retryCount ?? 0) > 0 && <span className="text-yellow-500">| retry #{retryCount}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {status === 'failed' && onRetry && (
            <button
              onClick={(e) => { e.stopPropagation(); onRetry(); }}
              className="px-2 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition"
            >
              Retry
            </button>
          )}
          <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${c.badge} ${status === 'running' ? 'animate-pulse' : ''}`}>
            {c.label}
          </span>
          {output && (
            <svg className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-800 p-3">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-md text-red-300 text-xs mb-3 font-mono">
              {error}
            </div>
          )}
          {output && (
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(output); }}
                className="absolute top-2 right-2 px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 rounded transition z-10"
              >
                Copy
              </button>
              <pre className="text-xs text-gray-300 whitespace-pre-wrap max-h-[500px] overflow-y-auto bg-gray-950 p-4 rounded-md leading-relaxed">
                {output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

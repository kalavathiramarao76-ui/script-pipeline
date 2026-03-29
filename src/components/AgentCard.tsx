'use client';

import { useState } from 'react';

interface AgentCardProps {
  agentId: number;
  name: string;
  phase: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  output?: string;
  error?: string;
}

export default function AgentCard({ agentId, name, phase, status, output, error }: AgentCardProps) {
  const [expanded, setExpanded] = useState(false);

  const statusColors = {
    pending: 'bg-gray-700 text-gray-300',
    running: 'bg-yellow-600 text-yellow-100 animate-pulse',
    completed: 'bg-green-700 text-green-100',
    failed: 'bg-red-700 text-red-100',
  };

  const statusIcons = {
    pending: '--',
    running: '...',
    completed: 'OK',
    failed: '!!',
  };

  return (
    <div className={`border rounded-lg p-4 ${status === 'running' ? 'border-yellow-500' : status === 'completed' ? 'border-green-600' : status === 'failed' ? 'border-red-600' : 'border-gray-700'} bg-gray-900`}>
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <span className="text-gray-500 font-mono text-sm">#{agentId}</span>
          <div>
            <h3 className="font-semibold text-white text-sm">{name}</h3>
            <span className="text-xs text-gray-400">{phase}</span>
          </div>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-mono ${statusColors[status]}`}>
          {statusIcons[status]} {status}
        </span>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          {error && (
            <div className="bg-red-900/50 p-3 rounded text-red-200 text-sm mb-2">
              {error}
            </div>
          )}
          {output ? (
            <pre className="text-xs text-gray-300 whitespace-pre-wrap max-h-96 overflow-y-auto bg-gray-950 p-3 rounded">
              {output}
            </pre>
          ) : (
            <p className="text-gray-500 text-sm">No output yet</p>
          )}
        </div>
      )}
    </div>
  );
}

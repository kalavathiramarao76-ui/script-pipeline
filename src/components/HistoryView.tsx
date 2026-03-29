'use client';

import { useEffect, useState } from 'react';

interface HistoryEntry {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  completedAt?: string;
}

interface HistoryViewProps {
  onLoad: (pipelineId: string) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function HistoryView({ onLoad }: HistoryViewProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'history' }),
    })
      .then(r => r.json())
      .then(data => {
        setHistory(data.history || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const statusBadge: Record<string, string> = {
    idle: 'bg-gray-800 text-gray-400',
    running: 'bg-yellow-500/20 text-yellow-400',
    completed: 'bg-green-500/20 text-green-400',
    failed: 'bg-red-500/20 text-red-400',
    cancelled: 'bg-gray-800 text-gray-500',
  };

  if (loading) {
    return (
      <div className="text-center py-20 text-gray-500">Loading history...</div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-full bg-gray-900 mx-auto flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-gray-500 text-sm">No pipeline runs yet</p>
        <p className="text-gray-600 text-xs mt-1">Your pipeline history will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {history.map(entry => (
        <div
          key={entry.id}
          onClick={() => onLoad(entry.id)}
          className="bg-gray-900 border border-gray-800 rounded-lg p-4 cursor-pointer hover:border-gray-700 transition group"
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-medium truncate group-hover:text-blue-400 transition">{entry.title}</p>
              <p className="text-xs text-gray-500 mt-1">{timeAgo(entry.createdAt)}</p>
            </div>
            <span className={`px-2 py-1 rounded text-xs font-medium shrink-0 ml-3 ${statusBadge[entry.status] || statusBadge.idle}`}>
              {entry.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

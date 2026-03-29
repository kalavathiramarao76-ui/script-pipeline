'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import AgentCard from './AgentCard';

interface AgentResult {
  agentId: number;
  agentName: string;
  phase: string;
  phaseNumber: number;
  output: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  error?: string;
  duration?: number;
  tokenEstimate?: number;
  retryCount: number;
}

interface PipelineState {
  id: string;
  title: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';
  results: Record<number, AgentResult>;
  currentAgent: number;
  currentStep: number;
  totalSteps: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  finalScript?: string;
  input: { productBrief: string; targetLength: string; format?: string };
}

const PHASES = [
  { num: 1, name: 'Research', icon: '1', agents: [1, 2, 3, 4] },
  { num: 2, name: 'Strategy', icon: '2', agents: [5, 6, 7] },
  { num: 3, name: 'Writing', icon: '3', agents: [8, 9, 10, 11, 12, 13] },
  { num: 4, name: 'Quality Control', icon: '4', agents: [14, 15, 16, 17] },
  { num: 5, name: 'Assembly', icon: '5', agents: [18, 19, 20] },
];

interface PipelineViewProps {
  pipelineId: string;
  initialState: PipelineState;
  onReset: () => void;
}

export default function PipelineView({ pipelineId, initialState, onReset }: PipelineViewProps) {
  const [state, setState] = useState<PipelineState>(initialState);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showScript, setShowScript] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status', pipelineId }),
      });
      const data = await res.json();
      if (data.state) {
        setState(data.state);
        if (data.state.status !== 'running') {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      }
    } catch {
      // Silently retry on next interval
    }
  }, [pipelineId]);

  useEffect(() => {
    if (state.status === 'running') {
      pollRef.current = setInterval(poll, 1500);
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }
  }, [state.status, poll]);

  // Also update when initialState changes
  useEffect(() => {
    setState(initialState);
  }, [initialState]);

  async function handleCancel() {
    await fetch('/api/pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel', pipelineId }),
    });
    poll();
  }

  async function handleRetryAgent(agentId: number) {
    await fetch('/api/pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'retry-agent', pipelineId, agentId }),
    });
    poll();
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export', pipelineId }),
      });
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data.export, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `script-pipeline-${pipelineId.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  function handleCopyScript() {
    const script = state.finalScript || state.results[20]?.output || state.results[19]?.output || '';
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const results = Object.values(state.results);
  const completed = results.filter(r => r.status === 'completed').length;
  const running = results.filter(r => r.status === 'running').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const progress = (completed / 20) * 100;
  const totalDuration = results.reduce((acc, r) => acc + (r.duration || 0), 0);

  const finalScript = state.finalScript || state.results[20]?.output || state.results[19]?.output || '';
  const hasScript = !!finalScript;

  const statusConfig: Record<string, { color: string; text: string; pulse: boolean }> = {
    idle: { color: 'text-gray-400', text: 'Idle', pulse: false },
    running: { color: 'text-yellow-400', text: `Running Step ${state.currentStep}/${state.totalSteps}`, pulse: true },
    completed: { color: 'text-green-400', text: 'Completed', pulse: false },
    failed: { color: 'text-red-400', text: 'Failed', pulse: false },
    cancelled: { color: 'text-gray-400', text: 'Cancelled', pulse: false },
  };
  const sc = statusConfig[state.status];

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-white font-semibold">{state.title}</h2>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                <span>{state.input.format}</span>
                <span>|</span>
                <span>{state.input.targetLength}</span>
                {totalDuration > 0 && (
                  <>
                    <span>|</span>
                    <span>Total: {Math.round(totalDuration / 1000)}s</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {state.status === 'running' && (
                <button onClick={handleCancel} className="px-3 py-1.5 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-md transition">
                  Cancel
                </button>
              )}
              {hasScript && (
                <button onClick={handleExport} disabled={exporting} className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md transition">
                  {exporting ? 'Exporting...' : 'Export'}
                </button>
              )}
              {state.status !== 'running' && (
                <button onClick={onReset} className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md transition">
                  New Pipeline
                </button>
              )}
            </div>
          </div>

          {/* Progress stats */}
          <div className="flex items-center gap-4 mb-3">
            <span className={`text-sm font-medium ${sc.color} ${sc.pulse ? 'animate-pulse' : ''}`}>{sc.text}</span>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="text-green-400">{completed} done</span>
              {running > 0 && <span className="text-yellow-400">{running} running</span>}
              {failed > 0 && <span className="text-red-400">{failed} failed</span>}
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-800 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-700 ease-out ${
                state.status === 'failed' ? 'bg-red-500' :
                state.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Phase indicators */}
          <div className="flex mt-3 gap-1">
            {PHASES.map(phase => {
              const agentResults = phase.agents.map(id => state.results[id]);
              const allDone = agentResults.every(r => r?.status === 'completed');
              const anyRunning = agentResults.some(r => r?.status === 'running');
              const anyFailed = agentResults.some(r => r?.status === 'failed');
              return (
                <div
                  key={phase.num}
                  className={`flex-1 h-1 rounded-full transition-colors duration-500 ${
                    allDone ? 'bg-green-500' :
                    anyFailed ? 'bg-red-500' :
                    anyRunning ? 'bg-yellow-500 animate-pulse' : 'bg-gray-800'
                  }`}
                  title={`Phase ${phase.num}: ${phase.name}`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Final Script Banner */}
      {hasScript && (
        <div className="bg-gray-900 rounded-xl border border-green-500/30 overflow-hidden">
          <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setShowScript(!showScript)}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <span className="text-green-400 text-sm">S</span>
              </div>
              <div>
                <h3 className="text-green-400 font-semibold text-sm">Final Script Ready</h3>
                <p className="text-xs text-gray-500">{finalScript.split(/\s+/).length} words | Click to {showScript ? 'collapse' : 'expand'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); handleCopyScript(); }}
                className="px-3 py-1.5 text-xs bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-md transition"
              >
                {copied ? 'Copied!' : 'Copy Script'}
              </button>
              <svg className={`w-4 h-4 text-gray-500 transition-transform ${showScript ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {showScript && (
            <div className="border-t border-gray-800 p-4">
              <pre className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{finalScript}</pre>
            </div>
          )}
        </div>
      )}

      {/* Agent Cards by Phase */}
      {PHASES.map(phase => {
        const phaseResults = phase.agents.map(id => state.results[id]).filter(Boolean);
        const phaseDone = phaseResults.filter(r => r.status === 'completed').length;
        const phaseTotal = phase.agents.length;

        return (
          <div key={phase.num}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                phaseDone === phaseTotal ? 'bg-green-500/20 text-green-400' :
                phaseDone > 0 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-800 text-gray-500'
              }`}>
                {phase.num}
              </div>
              <h2 className="text-sm font-medium text-gray-300">{phase.name}</h2>
              <span className="text-xs text-gray-600">{phaseDone}/{phaseTotal}</span>
            </div>
            <div className="grid gap-1.5 ml-9">
              {phase.agents.map(agentId => {
                const result = state.results[agentId];
                return result ? (
                  <AgentCard
                    key={agentId}
                    agentId={agentId}
                    name={result.agentName}
                    phase={result.phase}
                    status={result.status}
                    output={result.output}
                    error={result.error}
                    duration={result.duration}
                    tokenEstimate={result.tokenEstimate}
                    retryCount={result.retryCount}
                    onRetry={() => handleRetryAgent(agentId)}
                  />
                ) : null;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import AgentCard from './AgentCard';
import MarkdownOutput from './MarkdownOutput';

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
  { num: 1, name: 'Research', color: 'blue', agents: [1, 2, 3, 4], desc: 'YouTube, Reddit, X research + synthesis' },
  { num: 2, name: 'Strategy', color: 'purple', agents: [5, 6, 7], desc: 'Audience, angle, brand voice' },
  { num: 3, name: 'Writing', color: 'amber', agents: [8, 9, 10, 11, 12, 13], desc: 'Hook, body, CTA + quality gates' },
  { num: 4, name: 'Quality Control', color: 'orange', agents: [14, 15, 16, 17], desc: 'Novelty, intensity, filler, budget' },
  { num: 5, name: 'Assembly', color: 'green', agents: [18, 19, 20], desc: 'Assemble, polish, final review' },
];

const PHASE_COLORS: Record<string, { header: string; headerText: string; border: string }> = {
  blue:   { header: 'bg-blue-500/10', headerText: 'text-blue-400', border: 'border-blue-500/20' },
  purple: { header: 'bg-purple-500/10', headerText: 'text-purple-400', border: 'border-purple-500/20' },
  amber:  { header: 'bg-amber-500/10', headerText: 'text-amber-400', border: 'border-amber-500/20' },
  orange: { header: 'bg-orange-500/10', headerText: 'text-orange-400', border: 'border-orange-500/20' },
  green:  { header: 'bg-green-500/10', headerText: 'text-green-400', border: 'border-green-500/20' },
};

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
  const [viewMode, setViewMode] = useState<'flow' | 'list'>('flow');

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
    } catch { /* retry next interval */ }
  }, [pipelineId]);

  useEffect(() => {
    if (state.status === 'running') {
      pollRef.current = setInterval(poll, 1500);
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }
  }, [state.status, poll]);

  useEffect(() => { setState(initialState); }, [initialState]);

  async function handleCancel() {
    await fetch('/api/pipeline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'cancel', pipelineId }) });
    poll();
  }

  async function handleRetryAgent(agentId: number) {
    let aiSettings = null;
    try { aiSettings = JSON.parse(localStorage.getItem('ai-settings') || ''); } catch { /* */ }
    await fetch('/api/pipeline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'retry-agent', pipelineId, agentId, aiSettings }) });
    poll();
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch('/api/pipeline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'export', pipelineId }) });
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data.export, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `script-pipeline-${pipelineId.slice(0, 8)}.json`; a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
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

  return (
    <div className="space-y-5">
      {/* Status Header */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-white font-semibold">{state.title}</h2>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
              <span>{state.input.format}</span>
              <span className="text-gray-700">|</span>
              <span>{state.input.targetLength}</span>
              {totalDuration > 0 && <><span className="text-gray-700">|</span><span>{Math.round(totalDuration / 1000)}s total</span></>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex bg-gray-800 rounded-md p-0.5 text-xs">
              <button onClick={() => setViewMode('flow')} className={`px-2.5 py-1 rounded transition ${viewMode === 'flow' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}>Flow</button>
              <button onClick={() => setViewMode('list')} className={`px-2.5 py-1 rounded transition ${viewMode === 'list' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}>List</button>
            </div>
            {state.status === 'running' && (
              <button onClick={handleCancel} className="px-3 py-1.5 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-md transition">Cancel</button>
            )}
            {hasScript && (
              <button onClick={handleExport} disabled={exporting} className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md transition">{exporting ? '...' : 'Export'}</button>
            )}
            {state.status !== 'running' && (
              <button onClick={onReset} className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md transition">New</button>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-2">
          <span className={`text-xs font-medium ${
            state.status === 'running' ? 'text-yellow-400 animate-pulse' :
            state.status === 'completed' ? 'text-green-400' :
            state.status === 'failed' ? 'text-red-400' : 'text-gray-400'
          }`}>
            {state.status === 'running' ? `Step ${state.currentStep}/${state.totalSteps}` : state.status}
          </span>
          <div className="flex-1 bg-gray-800 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full transition-all duration-700 ${
              state.status === 'failed' ? 'bg-red-500' : state.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
            }`} style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs text-gray-500">{completed}/20</span>
          {running > 0 && <span className="text-xs text-yellow-400">{running} active</span>}
          {failed > 0 && <span className="text-xs text-red-400">{failed} failed</span>}
        </div>
      </div>

      {/* Final Script */}
      {hasScript && (
        <div className="bg-gray-900 rounded-xl border border-green-500/30 overflow-hidden">
          <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setShowScript(!showScript)}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <div>
                <h3 className="text-green-400 font-semibold text-sm">Final Script Ready</h3>
                <p className="text-xs text-gray-500">{finalScript.split(/\s+/).length} words</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={(e) => { e.stopPropagation(); handleCopyScript(); }} className="px-3 py-1.5 text-xs bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-md transition">
                {copied ? 'Copied!' : 'Copy Script'}
              </button>
              <svg className={`w-4 h-4 text-gray-500 transition-transform ${showScript ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {showScript && (
            <div className="border-t border-gray-800 p-5">
              <MarkdownOutput content={finalScript} />
            </div>
          )}
        </div>
      )}

      {/* === FLOW VIEW === */}
      {viewMode === 'flow' && (
        <div className="space-y-4">
          {PHASES.map((phase, phaseIdx) => {
            const pc = PHASE_COLORS[phase.color];
            const phaseResults = phase.agents.map(id => state.results[id]).filter(Boolean);
            const phaseDone = phaseResults.filter(r => r.status === 'completed').length;

            return (
              <div key={phase.num}>
                {/* Phase connector arrow */}
                {phaseIdx > 0 && (
                  <div className="flex justify-center -my-1">
                    <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                )}

                {/* Phase block */}
                <div className={`rounded-xl border ${pc.border} overflow-hidden`}>
                  {/* Phase header */}
                  <div className={`${pc.header} px-4 py-2.5 flex items-center justify-between`}>
                    <div className="flex items-center gap-2.5">
                      <span className={`text-xs font-bold ${pc.headerText}`}>PHASE {phase.num}</span>
                      <span className={`text-sm font-semibold ${pc.headerText}`}>{phase.name}</span>
                      <span className="text-xs text-gray-500 hidden sm:inline">{phase.desc}</span>
                    </div>
                    <span className="text-xs text-gray-500">{phaseDone}/{phase.agents.length}</span>
                  </div>

                  {/* Agents flow */}
                  <div className="p-4 bg-gray-950/50">
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      {phase.agents.map((agentId, agentIdx) => {
                        const result = state.results[agentId];
                        if (!result) return null;
                        return (
                          <div key={agentId} className="flex items-center gap-2">
                            <AgentCard
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
                              compact
                            />
                            {/* Arrow between agents within the same phase */}
                            {agentIdx < phase.agents.length - 1 && (
                              <svg className="w-4 h-4 text-gray-700 shrink-0 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* === LIST VIEW === */}
      {viewMode === 'list' && (
        <div className="space-y-5">
          {PHASES.map(phase => {
            const phaseResults = phase.agents.map(id => state.results[id]).filter(Boolean);
            const phaseDone = phaseResults.filter(r => r.status === 'completed').length;
            const pc = PHASE_COLORS[phase.color];

            return (
              <div key={phase.num}>
                <div className="flex items-center gap-2.5 mb-2">
                  <span className={`text-xs font-bold ${pc.headerText}`}>PHASE {phase.num}</span>
                  <span className="text-sm font-medium text-gray-300">{phase.name}</span>
                  <span className="text-xs text-gray-600">{phaseDone}/{phase.agents.length}</span>
                </div>
                <div className="grid gap-1.5 ml-1">
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
      )}
    </div>
  );
}
